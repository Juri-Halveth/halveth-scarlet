#include "ASHBOUNDGroundLab.h"

#include "Components/BoxComponent.h"
#include "Components/HierarchicalInstancedStaticMeshComponent.h"
#include "Components/InputComponent.h"
#include "Components/SceneComponent.h"
#include "Engine/StaticMesh.h"
#include "Engine/World.h"
#include "GameFramework/PlayerController.h"
#include "InputCoreTypes.h"
#include "Kismet/GameplayStatics.h"
#include "Materials/MaterialInterface.h"
#include "Misc/CommandLine.h"
#include "Misc/Parse.h"
#include "Misc/Paths.h"
#include "ProceduralMeshComponent.h"
#include "TimerManager.h"
#include "UnrealClient.h"

namespace
{
constexpr float HalfWorld = 250000.0f; // centimetres: +/- 2.5 km
constexpr float TileSize = 6400.0f;
constexpr float SampleStep = 200.0f;
constexpr float BedrockTop = -15200.0f;
constexpr int32 MaxTile = 78;
constexpr int32 Seed = 20261015;

uint32 Hash2(int32 X, int32 Y, int32 Salt)
{
    uint32 N = uint32(X) * 0x1F123BB5u ^ uint32(Y) * 0x5F356495u ^
        uint32(Salt) * 0x6C8E9CF5u;
    N ^= N >> 16; N *= 0x7FEB352Du;
    N ^= N >> 15; N *= 0x846CA68Bu;
    N ^= N >> 16;
    return N;
}

float Noise(float X, float Y, float Scale, int32 Salt)
{
    const float GX = X / Scale, GY = Y / Scale;
    const int32 IX = FMath::FloorToInt(GX), IY = FMath::FloorToInt(GY);
    float U = GX - IX, V = GY - IY;
    U = U * U * (3.0f - 2.0f * U);
    V = V * V * (3.0f - 2.0f * V);
    auto H = [Salt](int32 A, int32 B) { return double(Hash2(A, B, Salt)) / 4294967295.0; };
    const double A = FMath::Lerp(H(IX, IY), H(IX + 1, IY), double(U));
    const double B = FMath::Lerp(H(IX, IY + 1), H(IX + 1, IY + 1), double(U));
    return float(2.0 * FMath::Lerp(A, B, double(V)) - 1.0);
}

struct FSurface
{
    TArray<FVector> Vertices;
    TArray<int32> Indices;
    TArray<FVector> Normals;
    TArray<FVector2D> UVs;
    TArray<FLinearColor> Colors;
    TArray<FProcMeshTangent> Tangents;

    void AddTriangle(FVector A, FVector B, FVector C, const FVector& TowardAir,
        const FVector& Origin, bool bRock)
    {
        FVector Normal = FVector::CrossProduct(B - A, C - A).GetSafeNormal();
        if (Normal.IsNearlyZero()) return;
        if (FVector::DotProduct(Normal, TowardAir) < 0.0f)
        {
            Swap(B, C);
            Normal *= -1.0f;
        }
        const int32 Base = Vertices.Num();
        for (const FVector& P : {A, B, C})
        {
            Vertices.Add(P - Origin);
            Normals.Add(Normal);
            const FVector2D UV = FMath::Abs(Normal.Z) > 0.68f
                ? FVector2D(P.X / 240.0f, P.Y / 240.0f)
                : (FMath::Abs(Normal.X) > FMath::Abs(Normal.Y)
                    ? FVector2D(P.Y / 240.0f, P.Z / 240.0f)
                    : FVector2D(P.X / 240.0f, P.Z / 240.0f));
            UVs.Add(UV);
            const float Macro = Noise(P.X, P.Y, 6800.0f, Seed + 20);
            const float Detail = Noise(P.X, P.Y, 1050.0f, Seed + 21);
            const float Moisture = FMath::Clamp(0.5f + 0.35f * Macro + 0.15f * Detail, 0.0f, 1.0f);
            Colors.Add(bRock
                ? FMath::Lerp(FLinearColor(0.18f, 0.18f, 0.16f),
                              FLinearColor(0.31f, 0.27f, 0.21f), Moisture)
                : FMath::Lerp(FLinearColor(0.31f, 0.25f, 0.18f),
                              FLinearColor(0.18f, 0.24f, 0.17f), Moisture));
            Tangents.Add(FProcMeshTangent(1.0f, 0.0f, 0.0f));
        }
        // ProceduralMeshComponent's visible face uses the opposite winding
        // from the mathematical outward cross product used for lighting.
        Indices.Add(Base); Indices.Add(Base + 2); Indices.Add(Base + 1);
    }
};

constexpr int32 Corners[8][3] = {
    {0,0,0},{1,0,0},{1,1,0},{0,1,0},
    {0,0,1},{1,0,1},{1,1,1},{0,1,1}
};
constexpr int32 Tets[6][4] = {
    {0,5,1,6},{0,1,2,6},{0,2,3,6},
    {0,3,7,6},{0,7,4,6},{0,4,5,6}
};
}

AASHBOUNDGroundLab::AASHBOUNDGroundLab()
{
    PrimaryActorTick.bCanEverTick = true;
    GroundRoot = CreateDefaultSubobject<USceneComponent>(TEXT("GroundRoot"));
    RootComponent = GroundRoot;
}

float AASHBOUNDGroundLab::Height(float X, float Y) const
{
    const float Mx = X / 100.0f, My = Y / 100.0f;
    return 100.0f * (68.0f + 67.0f * Noise(Mx, My, 1400, Seed) +
        25.0f * Noise(Mx, My, 450, Seed + 1) +
        12.0f * Noise(Mx, My, 110, Seed + 2) +
        2.5f * Noise(Mx, My, 24, Seed + 3));
}

float AASHBOUNDGroundLab::Density(const FVector& P) const
{
    if (P.Z <= BedrockTop) return 1.0f;
    float Result = Height(P.X, P.Y) - P.Z;
    for (const FDig& Dig : Digs)
    {
        if (FMath::Abs(P.X - Dig.Centre.X) > Dig.Radius ||
            FMath::Abs(P.Y - Dig.Centre.Y) > Dig.Radius ||
            FMath::Abs(P.Z - Dig.Centre.Z) > Dig.Radius) continue;
        Result = FMath::Min(Result, FVector::Distance(P, Dig.Centre) - Dig.Radius);
    }
    return Result;
}

int32 AASHBOUNDGroundLab::TileIndex(float Coordinate) const
{
    return FMath::Clamp(FMath::FloorToInt((Coordinate + HalfWorld) / TileSize), 0, MaxTile);
}

void AASHBOUNDGroundLab::BeginPlay()
{
    Super::BeginPlay();
    SoilMaterial = LoadObject<UMaterialInterface>(nullptr,
        TEXT("/Game/ASHBOUND/Surfaces/M_FoundationSoil.M_FoundationSoil"));
    RockMaterial = LoadObject<UMaterialInterface>(nullptr,
        TEXT("/Game/ASHBOUND/Surfaces/M_FoundationRock.M_FoundationRock"));
    TreeMesh = LoadObject<UStaticMesh>(nullptr,
        TEXT("/Game/ASHBOUND/Models/pine_sapling_small/pine_sapling_small_1k/StaticMeshes/pine_sapling_small_b.pine_sapling_small_b"));
    GrassMesh = LoadObject<UStaticMesh>(nullptr,
        TEXT("/Game/ASHBOUND/Models/grass_medium_01/grass_medium_01_1k/StaticMeshes/grass_medium_01_small_a_LOD0.grass_medium_01_small_a_LOD0"));
    FernMesh = LoadObject<UStaticMesh>(nullptr,
        TEXT("/Game/ASHBOUND/Models/fern_02/fern_02_1k/StaticMeshes/fern_02_a.fern_02_a"));
    RockMesh = LoadObject<UStaticMesh>(nullptr,
        TEXT("/Game/ASHBOUND/Models/boulder_01/boulder_01_1k/StaticMeshes/boulder_01_1k.boulder_01_1k"));
    if (!SoilMaterial || !RockMaterial || !TreeMesh || !GrassMesh || !FernMesh || !RockMesh)
    {
        UE_LOG(LogTemp, Error, TEXT("ASHBOUND_FOUNDATION missing cooked materials or plants"));
        SetActorTickEnabled(false);
        return;
    }
    // Only the independent QA run starts with a demonstrative cut. Normal play
    // begins with intact earth and G carves at the first blocking 3D surface.
#if !UE_BUILD_SHIPPING
    const bool bQa = FParse::Param(FCommandLine::Get(), TEXT("ashboundqafoundation"));
    if (bQa) Digs.Add({FVector(0, 0, Height(0, 0) - 500.0f), 800.0f});
#endif
    CreateTile(FIntPoint(TileIndex(0), TileIndex(0)));
    for (int32 Side = 0; Side < 4; ++Side)
    {
        UBoxComponent* Boundary = NewObject<UBoxComponent>(this,
            FName(*FString::Printf(TEXT("FoundationWorldBound_%d"), Side)));
        AddInstanceComponent(Boundary);
        Boundary->SetupAttachment(GroundRoot);
        Boundary->SetBoxExtent(Side < 2
            ? FVector(150.0f, HalfWorld + 150.0f, 30000.0f)
            : FVector(HalfWorld + 150.0f, 150.0f, 30000.0f));
        Boundary->SetRelativeLocation(Side == 0 ? FVector(-HalfWorld, 0, 5000)
            : Side == 1 ? FVector(HalfWorld, 0, 5000)
            : Side == 2 ? FVector(0, -HalfWorld, 5000)
            : FVector(0, HalfWorld, 5000));
        Boundary->SetCollisionProfileName(TEXT("BlockAll"));
        Boundary->SetHiddenInGame(true);
        Boundary->RegisterComponent();
        WorldBounds.Add(Boundary);
    }
    if (APlayerController* PC = UGameplayStatics::GetPlayerController(this, 0))
    {
        EnableInput(PC);
        if (InputComponent)
            InputComponent->BindKey(EKeys::G, IE_Pressed, this, &AASHBOUNDGroundLab::DigInFront);
    }
#if !UE_BUILD_SHIPPING
    if (bQa)
    {
        FTimerHandle Timer;
        GetWorldTimerManager().SetTimer(Timer, this, &AASHBOUNDGroundLab::RunQa, 5.0f, false);
    }
    if (FParse::Param(FCommandLine::Get(), TEXT("ashboundqafoundationview")))
    {
        FTimerHandle ViewTimer, FirstShot, DigTimer, SecondShot;
        GetWorldTimerManager().SetTimer(ViewTimer, FTimerDelegate::CreateWeakLambda(this, [this]()
        {
            if (APlayerController* PC = UGameplayStatics::GetPlayerController(this, 0))
                PC->SetControlRotation(FRotator(-12.0f, 32.0f, 0.0f));
        }), 2.0f, false);
        GetWorldTimerManager().SetTimer(FirstShot, FTimerDelegate::CreateLambda([]()
        {
            FScreenshotRequest::RequestScreenshot(FPaths::ProjectSavedDir() /
                TEXT("Screenshots/ASHBOUND-Foundation-3D.png"), false, false);
        }), 7.0f, false);
        GetWorldTimerManager().SetTimer(DigTimer, FTimerDelegate::CreateWeakLambda(this, [this]()
        {
            DigAt(FVector(550.0f, 350.0f, Height(550.0f, 350.0f) - 250.0f), 480.0f);
        }), 8.5f, false);
        GetWorldTimerManager().SetTimer(SecondShot, FTimerDelegate::CreateLambda([]()
        {
            FScreenshotRequest::RequestScreenshot(FPaths::ProjectSavedDir() /
                TEXT("Screenshots/ASHBOUND-Foundation-Dug.png"), false, false);
        }), 11.0f, false);
    }
#endif
    UE_LOG(LogTemp, Display, TEXT("ASHBOUND_FOUNDATION 3D streaming ground ready, domain=5000x5000m"));
}

void AASHBOUNDGroundLab::CreateTile(const FIntPoint& Key)
{
    if (Key.X < 0 || Key.X > MaxTile || Key.Y < 0 || Key.Y > MaxTile || Tiles.Contains(Key)) return;
    const float X0 = -HalfWorld + Key.X * TileSize;
    const float Y0 = -HalfWorld + Key.Y * TileSize;
    const float X1 = FMath::Min(HalfWorld, X0 + TileSize);
    const float Y1 = FMath::Min(HalfWorld, Y0 + TileSize);
    const int32 NX = FMath::RoundToInt((X1 - X0) / SampleStep);
    const int32 NY = FMath::RoundToInt((Y1 - Y0) / SampleStep);
    float MinH = TNumericLimits<float>::Max(), MaxH = -TNumericLimits<float>::Max();
    for (int32 Y = 0; Y <= NY; ++Y)
    for (int32 X = 0; X <= NX; ++X)
    {
        const float H = Height(X0 + X * SampleStep, Y0 + Y * SampleStep);
        MinH = FMath::Min(MinH, H); MaxH = FMath::Max(MaxH, H);
    }
    // All tiles share the same global Z lattice. Their sampled bands may
    // differ, while overlap and excavation seams keep identical coordinates.
    float Bottom = MinH - 5200.0f;
    for (const FDig& Dig : Digs)
        if (Dig.Centre.X + Dig.Radius >= X0 && Dig.Centre.X - Dig.Radius <= X1 &&
            Dig.Centre.Y + Dig.Radius >= Y0 && Dig.Centre.Y - Dig.Radius <= Y1)
            Bottom = FMath::Min(Bottom, Dig.Centre.Z - Dig.Radius - 2.0f * SampleStep);
    const float Z0 = FMath::Max(BedrockTop,
        SampleStep * FMath::FloorToFloat(Bottom / SampleStep));
    const float Z1 = SampleStep * FMath::CeilToFloat((MaxH + 800.0f) / SampleStep);
    const int32 NZ = FMath::RoundToInt((Z1 - Z0) / SampleStep);
    const FVector Origin(X0, Y0, 0);
    auto At = [NX, NY](int32 X, int32 Y, int32 Z)
    { return (Z * (NY + 1) + Y) * (NX + 1) + X; };
    TArray<FVector> Points;
    TArray<float> Values;
    Points.SetNumUninitialized((NX + 1) * (NY + 1) * (NZ + 1));
    Values.SetNumUninitialized(Points.Num());
    for (int32 Z = 0; Z <= NZ; ++Z)
    for (int32 Y = 0; Y <= NY; ++Y)
    for (int32 X = 0; X <= NX; ++X)
    {
        const int32 Index = At(X, Y, Z);
        Points[Index] = FVector(X0 + X * SampleStep, Y0 + Y * SampleStep,
            Z0 + Z * SampleStep);
        Values[Index] = Density(Points[Index]);
    }
    FSurface Soil, Rock;
    for (int32 Z = 0; Z < NZ; ++Z)
    for (int32 Y = 0; Y < NY; ++Y)
    for (int32 X = 0; X < NX; ++X)
    {
        int32 Id[8];
        bool bSolid = false, bAir = false;
        for (int32 C = 0; C < 8; ++C)
        {
            Id[C] = At(X + Corners[C][0], Y + Corners[C][1], Z + Corners[C][2]);
            bSolid |= Values[Id[C]] > 0.0f;
            bAir |= Values[Id[C]] <= 0.0f;
        }
        if (!bSolid || !bAir) continue;
        for (const auto& Tet : Tets)
        {
            int32 Solid[4], Air[4], NS = 0, NA = 0;
            for (int32 C : Tet)
                (Values[Id[C]] > 0.0f ? Solid[NS++] : Air[NA++]) = C;
            if (!NS || !NA) continue;
            FVector SolidMean(0), AirMean(0);
            for (int32 I = 0; I < NS; ++I) SolidMean += Points[Id[Solid[I]]];
            for (int32 I = 0; I < NA; ++I) AirMean += Points[Id[Air[I]]];
            const FVector TowardAir = AirMean / float(NA) - SolidMean / float(NS);
            auto Edge = [&Id, &Points, &Values](int32 A, int32 B)
            {
                const int32 IA = Id[A], IB = Id[B];
                const float T = Values[IA] / (Values[IA] - Values[IB]);
                return FMath::Lerp(Points[IA], Points[IB], T);
            };
            auto Face = [this, &Soil, &Rock, &TowardAir, &Origin](FVector A, FVector B, FVector C)
            {
                const FVector Mid = (A + B + C) / 3.0f;
                const bool bRock = Height(Mid.X, Mid.Y) - Mid.Z >= 350.0f;
                FSurface& Surface = bRock ? Rock : Soil;
                Surface.AddTriangle(A, B, C, TowardAir, Origin, bRock);
            };
            if (NS == 1)
                Face(Edge(Solid[0], Air[0]), Edge(Solid[0], Air[1]), Edge(Solid[0], Air[2]));
            else if (NA == 1)
                Face(Edge(Solid[0], Air[0]), Edge(Solid[1], Air[0]), Edge(Solid[2], Air[0]));
            else
            {
                const FVector P = Edge(Solid[0], Air[0]);
                const FVector Q = Edge(Solid[0], Air[1]);
                const FVector R = Edge(Solid[1], Air[0]);
                const FVector S = Edge(Solid[1], Air[1]);
                Face(P, Q, R); Face(Q, S, R);
            }
        }
    }

    FTile Tile;
    Tile.Ground = NewObject<UProceduralMeshComponent>(this,
        FName(*FString::Printf(TEXT("Foundation_%d_%d"), Key.X, Key.Y)));
    AddInstanceComponent(Tile.Ground);
    Tile.Ground->SetupAttachment(GroundRoot);
    Tile.Ground->SetRelativeLocation(Origin);
    Tile.Ground->SetCollisionProfileName(TEXT("BlockAll"));
    Tile.Ground->bUseAsyncCooking = false; // collision exists when player reaches tile
    Tile.Ground->RegisterComponent();
    Tile.Ground->CreateMeshSection_LinearColor(0, Soil.Vertices, Soil.Indices,
        Soil.Normals, Soil.UVs, Soil.Colors, Soil.Tangents, true);
    Tile.Ground->CreateMeshSection_LinearColor(1, Rock.Vertices, Rock.Indices,
        Rock.Normals, Rock.UVs, Rock.Colors, Rock.Tangents, true);
    Tile.Ground->SetMaterial(0, SoilMaterial);
    Tile.Ground->SetMaterial(1, RockMaterial);

    auto MakePlants = [this, &Key](const TCHAR* Kind, UStaticMesh* Mesh, bool bSolid)
    {
        UHierarchicalInstancedStaticMeshComponent* Plants =
            NewObject<UHierarchicalInstancedStaticMeshComponent>(this,
                FName(*FString::Printf(TEXT("%s_%d_%d"), Kind, Key.X, Key.Y)));
        AddInstanceComponent(Plants);
        Plants->SetupAttachment(GroundRoot);
        Plants->SetStaticMesh(Mesh);
        Plants->SetCollisionEnabled(bSolid ? ECollisionEnabled::QueryAndPhysics
                                           : ECollisionEnabled::NoCollision);
        if (bSolid) Plants->SetCollisionProfileName(TEXT("BlockAll"));
        Plants->RegisterComponent();
        return Plants;
    };
    Tile.Trees = MakePlants(TEXT("FoundationTrees"), TreeMesh, true);
    Tile.Grass = MakePlants(TEXT("FoundationGrass"), GrassMesh, false);
    Tile.Ferns = MakePlants(TEXT("FoundationFerns"), FernMesh, false);
    Tile.Rocks = MakePlants(TEXT("FoundationRocks"), RockMesh, true);
    auto ApplyMaterial = [](UHierarchicalInstancedStaticMeshComponent* Plants,
        int32 Slot, const TCHAR* Path)
    {
        if (UMaterialInterface* Material = LoadObject<UMaterialInterface>(nullptr, Path))
            Plants->SetMaterial(Slot, Material);
    };
    ApplyMaterial(Tile.Ferns, 0,
        TEXT("/Game/ASHBOUND/Surfaces/M_FoundationFern.M_FoundationFern"));
    ApplyMaterial(Tile.Grass, 0,
        TEXT("/Game/ASHBOUND/Surfaces/M_FoundationGrass.M_FoundationGrass"));
    ApplyMaterial(Tile.Rocks, 0,
        TEXT("/Game/ASHBOUND/Surfaces/M_FoundationBoulder.M_FoundationBoulder"));
    ApplyMaterial(Tile.Trees, 0,
        TEXT("/Game/ASHBOUND/Surfaces/M_FoundationBark.M_FoundationBark"));
    ApplyMaterial(Tile.Trees, 1,
        TEXT("/Game/ASHBOUND/Surfaces/M_FoundationTwig.M_FoundationTwig"));
    FRandomStream Random(Hash2(Key.X, Key.Y, Seed + 50));
    for (int32 I = 0; I < 294; ++I)
    {
        const bool bTree = I < 4;
        const bool bRock = I >= 4 && I < 32;
        const bool bFern = I >= 32 && I < 114;
        UHierarchicalInstancedStaticMeshComponent* Plants = bTree ? Tile.Trees
            : bRock ? Tile.Rocks : bFern ? Tile.Ferns : Tile.Grass;
        const UStaticMesh* Asset = bTree ? TreeMesh.Get()
            : bRock ? RockMesh.Get() : bFern ? FernMesh.Get() : GrassMesh.Get();
        const FVector Xy(Random.FRandRange(X0 + 120.0f, X1 - 120.0f),
            Random.FRandRange(Y0 + 120.0f, Y1 - 120.0f), 0);
        const float H = Height(Xy.X, Xy.Y);
        if (Density(FVector(Xy.X, Xy.Y, H - 15.0f)) <= 0.0f) continue;
        const FBox Bounds = Asset->GetBoundingBox();
        const float Desired = bTree ? Random.FRandRange(450.0f, 850.0f)
            : bRock ? Random.FRandRange(80.0f, 310.0f)
            : bFern ? Random.FRandRange(55.0f, 155.0f)
            : Random.FRandRange(35.0f, 90.0f);
        const float Scale = Desired / FMath::Max(1.0f, Bounds.GetSize().Z);
        const float Yaw = Random.FRandRange(0.0f, 360.0f);
        const float Embed = bRock ? Desired * 0.13f : 5.0f;
        const FVector Position(Xy.X, Xy.Y, H - Bounds.Min.Z * Scale - Embed);
        Plants->AddInstance(FTransform(FRotator(0, Yaw, 0), Position, FVector(Scale)), true);
    }
    Tiles.Add(Key, Tile);
    UE_LOG(LogTemp, Display, TEXT("ASHBOUND_FOUNDATION_TILE x=%d y=%d soil=%d rock=%d trees=%d rocks=%d ferns=%d grass=%d"),
        Key.X, Key.Y, Soil.Indices.Num() / 3, Rock.Indices.Num() / 3,
        Tile.Trees->GetInstanceCount(), Tile.Rocks->GetInstanceCount(),
        Tile.Ferns->GetInstanceCount(), Tile.Grass->GetInstanceCount());
}

void AASHBOUNDGroundLab::RemoveTile(const FIntPoint& Key)
{
    FTile Tile;
    if (!Tiles.RemoveAndCopyValue(Key, Tile)) return;
    if (Tile.Ground) Tile.Ground->DestroyComponent();
    if (Tile.Trees) Tile.Trees->DestroyComponent();
    if (Tile.Grass) Tile.Grass->DestroyComponent();
    if (Tile.Ferns) Tile.Ferns->DestroyComponent();
    if (Tile.Rocks) Tile.Rocks->DestroyComponent();
}

void AASHBOUNDGroundLab::Refresh(const FVector& Position)
{
    const FIntPoint Centre(TileIndex(Position.X), TileIndex(Position.Y));
    TArray<FIntPoint> Old;
    for (const auto& Pair : Tiles)
        if (FMath::Abs(Pair.Key.X - Centre.X) > 1 || FMath::Abs(Pair.Key.Y - Centre.Y) > 1)
            Old.Add(Pair.Key);
    for (const FIntPoint& Key : Old) RemoveTile(Key);
    // At most one new 3D/collision chunk per update to avoid a large hitch.
    for (int32 Y = Centre.Y - 1; Y <= Centre.Y + 1; ++Y)
    for (int32 X = Centre.X - 1; X <= Centre.X + 1; ++X)
        if (X >= 0 && X <= MaxTile && Y >= 0 && Y <= MaxTile &&
            !Tiles.Contains(FIntPoint(X, Y)))
        {
            CreateTile(FIntPoint(X, Y));
            return;
        }
}

void AASHBOUNDGroundLab::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);
    RefreshClock += DeltaSeconds;
    if (RefreshClock < 0.35f) return;
    RefreshClock = 0;
    if (const APawn* Pawn = UGameplayStatics::GetPlayerPawn(this, 0))
        Refresh(Pawn->GetActorLocation());
}

void AASHBOUNDGroundLab::DigAt(const FVector& Position, float Radius)
{
    if (Digs.Num() >= 32 || Radius <= 0.0f || Radius > 2400.0f ||
        FMath::Abs(Position.X) + Radius > HalfWorld ||
        FMath::Abs(Position.Y) + Radius > HalfWorld ||
        Position.Z - Radius <= BedrockTop + 4.0f * SampleStep) return;
    Digs.Add({Position, Radius});
    TArray<FIntPoint> Affected;
    for (const auto& Pair : Tiles)
    {
        const float X0 = -HalfWorld + Pair.Key.X * TileSize;
        const float Y0 = -HalfWorld + Pair.Key.Y * TileSize;
        if (Position.X + Radius >= X0 && Position.X - Radius <= X0 + TileSize &&
            Position.Y + Radius >= Y0 && Position.Y - Radius <= Y0 + TileSize)
            Affected.Add(Pair.Key);
    }
    for (const FIntPoint& Key : Affected)
    {
        RemoveTile(Key);
        CreateTile(Key);
    }
    UE_LOG(LogTemp, Display, TEXT("ASHBOUND_FOUNDATION_DIG x=%.0f y=%.0f z=%.0f r=%.0f changed=%d"),
        Position.X, Position.Y, Position.Z, Radius, Affected.Num());
}

void AASHBOUNDGroundLab::DigInFront()
{
    const APlayerController* PC = UGameplayStatics::GetPlayerController(this, 0);
    if (!PC) return;
    FVector Eye; FRotator View;
    PC->GetPlayerViewPoint(Eye, View);
    FHitResult Hit;
    FCollisionQueryParams Params(SCENE_QUERY_STAT(ASHBOUNDFoundationDig), false);
    if (PC->GetPawn()) Params.AddIgnoredActor(PC->GetPawn());
    if (!GetWorld()->LineTraceSingleByChannel(Hit, Eye,
        Eye + View.Vector() * 900.0f, ECC_Visibility, Params)) return;
    bool bGround = false;
    for (const auto& Pair : Tiles) bGround |= Hit.GetComponent() == Pair.Value.Ground;
    if (bGround) DigAt(Hit.ImpactPoint - Hit.ImpactNormal * 260.0f, 420.0f);
}

void AASHBOUNDGroundLab::RunQa()
{
#if !UE_BUILD_SHIPPING
    auto Trace = [this](float X, float Y)
    {
        FHitResult Hit;
        FCollisionQueryParams Params(SCENE_QUERY_STAT(ASHBOUNDFoundationQA), false);
        if (APawn* Pawn = UGameplayStatics::GetPlayerPawn(this, 0)) Params.AddIgnoredActor(Pawn);
        const bool bHit = GetWorld()->LineTraceSingleByChannel(Hit,
            FVector(X, Y, Height(X, Y) + 2000.0f),
            FVector(X, Y, Height(X, Y) - 4000.0f), ECC_Visibility, Params);
        return bHit ? Hit.ImpactPoint.Z : -999999.0f;
    };
    const float Original = Height(0, 0);
    const float Dug = Trace(0, 0);
    const float Intact = Trace(1800, 0);
    const float DeepX = 3200.0f, DeepY = 0.0f;
    const float DeepCentre = Height(DeepX, DeepY) - 7000.0f;
    DigAt(FVector(DeepX, DeepY, DeepCentre), 800.0f);
    FHitResult DeepHit;
    FCollisionQueryParams DeepParams(SCENE_QUERY_STAT(ASHBOUNDFoundationDeepQA), false);
    if (APawn* Pawn = UGameplayStatics::GetPlayerPawn(this, 0))
        DeepParams.AddIgnoredActor(Pawn);
    const bool bDeepFloor = GetWorld()->LineTraceSingleByChannel(DeepHit,
        FVector(DeepX, DeepY, DeepCentre),
        FVector(DeepX, DeepY, DeepCentre - 1800.0f), ECC_Visibility, DeepParams);
    const FIntPoint FarKey(TileIndex(200000.0f), TileIndex(-180000.0f));
    CreateTile(FarKey);
    const float FarGround = Trace(200000.0f, -180000.0f);
    const bool bPass = Tiles.Contains(FIntPoint(TileIndex(0), TileIndex(0))) &&
        Dug > Original - 2500.0f && Dug < Original - 500.0f &&
        FMath::Abs(Intact - Height(1800, 0)) < 450.0f &&
        bDeepFloor && FMath::Abs(DeepHit.ImpactPoint.Z - (DeepCentre - 800.0f)) < 450.0f &&
        FMath::Abs(FarGround - Height(200000.0f, -180000.0f)) < 450.0f;
    UE_LOG(LogTemp, Display, TEXT("ASHBOUND_FOUNDATION_QA pass=%d intact=%.1f dug=%.1f original=%.1f deep=%.1f far=%.1f tiles=%d"),
        bPass ? 1 : 0, Intact, Dug, Original,
        bDeepFloor ? DeepHit.ImpactPoint.Z : -999999.0f, FarGround, Tiles.Num());
    if (!bPass) UE_LOG(LogTemp, Error, TEXT("ASHBOUND_FOUNDATION_QA FAIL"));
#endif
}
