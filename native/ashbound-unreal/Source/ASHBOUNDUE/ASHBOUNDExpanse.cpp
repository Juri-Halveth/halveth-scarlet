#include "ASHBOUNDExpanse.h"

#include "Components/HierarchicalInstancedStaticMeshComponent.h"
#include "Components/SceneComponent.h"
#include "Engine/StaticMesh.h"
#include "Kismet/GameplayStatics.h"
#include "Materials/MaterialInterface.h"
#include "Misc/CommandLine.h"
#include "Misc/Parse.h"
#include "ProceduralMeshComponent.h"
#include "TimerManager.h"

namespace
{
constexpr float EastEdge = 10500.0f;
constexpr float TileSize = 12800.0f;
constexpr int32 TileSteps = 40;
constexpr int32 ActiveRadius = 1;

uint32 TileSeed(const FIntPoint& Key)
{
    return HashCombine(GetTypeHash(Key.X), GetTypeHash(Key.Y)) ^ 0xA5B0D31u;
}
}

AASHBOUNDExpanse::AASHBOUNDExpanse()
{
    PrimaryActorTick.bCanEverTick = true;
    ExpanseRoot = CreateDefaultSubobject<USceneComponent>(TEXT("ExpanseRoot"));
    RootComponent = ExpanseRoot;
}

void AASHBOUNDExpanse::BeginPlay()
{
    Super::BeginPlay();
    GroundMaterial = LoadObject<UMaterialInterface>(nullptr,
        TEXT("/Game/ASHBOUND/Surfaces/M_AshGround.M_AshGround"));
    RockMesh = LoadObject<UStaticMesh>(nullptr,
        TEXT("/Game/ASHBOUND/Models/boulder_01/boulder_01_1k/StaticMeshes/boulder_01_1k.boulder_01_1k"));
    TreeMesh = LoadObject<UStaticMesh>(nullptr,
        TEXT("/Game/ASHBOUND/Models/pine_sapling_small/pine_sapling_small_1k/StaticMeshes/pine_sapling_small_b.pine_sapling_small_b"));
    FernMesh = LoadObject<UStaticMesh>(nullptr,
        TEXT("/Game/ASHBOUND/Models/fern_02/fern_02_1k/StaticMeshes/fern_02_b.fern_02_b"));
    GrassMesh = LoadObject<UStaticMesh>(nullptr,
        TEXT("/Game/ASHBOUND/Models/grass_medium_01/grass_medium_01_1k/StaticMeshes/grass_medium_01_small_a_LOD0.grass_medium_01_small_a_LOD0"));
    if (!GroundMaterial || !RockMesh || !TreeMesh || !FernMesh || !GrassMesh)
    {
        UE_LOG(LogTemp, Error, TEXT("ASHBOUND_EXPANSE missing cooked source assets"));
        SetActorTickEnabled(false);
        return;
    }

#if !UE_BUILD_SHIPPING
    if (FParse::Param(FCommandLine::Get(), TEXT("ashboundqaexpanse")))
    {
        Refresh(FVector(EastEdge + 3500.0f, 0.0f, 0.0f));
        bQaPending = true;
        FTimerHandle QaTimer;
        GetWorldTimerManager().SetTimer(QaTimer, this, &AASHBOUNDExpanse::RunGroundQa, 4.0f, false);
    }
#endif
}

float AASHBOUNDExpanse::LegacyEastHeight(float Y) const
{
    // Match the source formula in tools/surface_reference.py at X=EastEdge.
    const float Side = FMath::Max(0.0f, FMath::Abs(Y) - 1100.0f) / 6500.0f;
    const float Ridge = 2100.0f * FMath::Pow(Side, 1.35f);
    const float Shoulder = 380.0f * Side * FMath::Sin(EastEdge / 980.0f + Y / 770.0f);
    const float Rocks = 190.0f * Side * FMath::Sin(EastEdge / 370.0f) * FMath::Cos(Y / 460.0f);
    const float Lowland = (1.0f - FMath::Min(1.0f, Side * 4.0f)) *
        (12.0f * FMath::Sin(EastEdge / 440.0f) + 8.0f * FMath::Cos(Y / 330.0f));
    const float Base = Ridge + Shoulder + Rocks + Lowland - 18.0f;
    return Base + (FMath::Abs(Y) <= 1350.0f ? 2.0f : 0.0f);
}

float AASHBOUNDExpanse::Height(float X, float Y) const
{
    const float Distance = FMath::Max(0.0f, X - EastEdge);
    const float Blend = FMath::Clamp(Distance / 3600.0f, 0.0f, 1.0f);
    const float SmoothBlend = Blend * Blend * (3.0f - 2.0f * Blend);
    const float Broad = FMath::PerlinNoise2D(FVector2D(X / 22000.0f, Y / 22000.0f));
    const float Ridge = FMath::Abs(FMath::PerlinNoise2D(
        FVector2D(X / 10500.0f + 7.0f, Y / 10500.0f - 2.0f)));
    const float Detail = FMath::PerlinNoise2D(FVector2D(X / 2400.0f, Y / 2400.0f));
    const float Biome = 440.0f * Broad + 380.0f * Ridge + 95.0f * Detail;
    const float Spur = 170.0f * FMath::Sin(Y / 7600.0f + X / 11000.0f);
    return LegacyEastHeight(Y) + SmoothBlend * (Biome + Spur);
}

UHierarchicalInstancedStaticMeshComponent* AASHBOUNDExpanse::MakeFoliage(
    const FIntPoint& Key, const TCHAR* Kind, UStaticMesh* Mesh, bool bSolid)
{
    const FName Name(*FString::Printf(TEXT("%s_%d_%d"), Kind, Key.X, Key.Y));
    UHierarchicalInstancedStaticMeshComponent* Component =
        NewObject<UHierarchicalInstancedStaticMeshComponent>(this, Name);
    AddInstanceComponent(Component);
    Component->SetupAttachment(ExpanseRoot);
    Component->SetStaticMesh(Mesh);
    Component->SetCollisionEnabled(bSolid ? ECollisionEnabled::QueryAndPhysics
                                           : ECollisionEnabled::NoCollision);
    Component->RegisterComponent();
    return Component;
}

void AASHBOUNDExpanse::PlaceFoliage(UHierarchicalInstancedStaticMeshComponent* Component,
    FRandomStream& Random, const FIntPoint& Key, int32 Count,
    float MinHeight, float MaxHeight, float RoadClearance)
{
    if (!Component || !Component->GetStaticMesh()) return;
    const FBox Bounds = Component->GetStaticMesh()->GetBoundingBox();
    const FVector Centre = Bounds.GetCenter();
    const float MeshHeight = FMath::Max(1.0f, Bounds.GetSize().Z);
    for (int32 Index = 0; Index < Count; ++Index)
    {
        const float X = EastEdge + Key.X * TileSize + Random.FRandRange(350.0f, TileSize - 350.0f);
        const float Y = Key.Y * TileSize + Random.FRandRange(350.0f, TileSize - 350.0f);
        if (Key.X == 0 && FMath::Abs(Y) < RoadClearance) continue;
        const float Scale = Random.FRandRange(MinHeight, MaxHeight) / MeshHeight;
        const float Yaw = Random.FRandRange(0.0f, 360.0f);
        const float Angle = FMath::DegreesToRadians(Yaw);
        const FVector Offset((Centre.X * FMath::Cos(Angle) - Centre.Y * FMath::Sin(Angle)) * Scale,
            (Centre.X * FMath::Sin(Angle) + Centre.Y * FMath::Cos(Angle)) * Scale, 0.0f);
        const FVector Position(X - Offset.X, Y - Offset.Y,
            Height(X, Y) - Bounds.Min.Z * Scale - 8.0f);
        Component->AddInstance(FTransform(FRotator(0.0f, Yaw, 0.0f), Position,
            FVector(Scale)), true);
    }
}

void AASHBOUNDExpanse::CreateTile(const FIntPoint& Key)
{
    if (Key.X < 0 || Tiles.Contains(Key)) return;
    FTile Tile;
    const FName Name(*FString::Printf(TEXT("Terrain_%d_%d"), Key.X, Key.Y));
    Tile.Ground = NewObject<UProceduralMeshComponent>(this, Name);
    AddInstanceComponent(Tile.Ground);
    Tile.Ground->SetupAttachment(ExpanseRoot);
    Tile.Ground->SetRelativeLocation(FVector(EastEdge + Key.X * TileSize,
        Key.Y * TileSize, 0.0f));
    Tile.Ground->SetCollisionProfileName(TEXT("BlockAll"));
    Tile.Ground->bUseAsyncCooking = true;
    Tile.Ground->RegisterComponent();

    TArray<FVector> Vertices, Normals;
    TArray<FVector2D> UVs;
    TArray<FLinearColor> Colors;
    TArray<FProcMeshTangent> Tangents;
    TArray<int32> Indices;
    const int32 Width = TileSteps + 1;
    Vertices.Reserve(Width * Width);
    Normals.Reserve(Width * Width);
    UVs.Reserve(Width * Width);
    Colors.Reserve(Width * Width);
    Tangents.Reserve(Width * Width);
    Indices.Reserve(TileSteps * TileSteps * 6);
    for (int32 J = 0; J <= TileSteps; ++J)
    for (int32 I = 0; I <= TileSteps; ++I)
    {
        const float LocalX = TileSize * I / TileSteps;
        const float LocalY = TileSize * J / TileSteps;
        const float X = EastEdge + Key.X * TileSize + LocalX;
        const float Y = Key.Y * TileSize + LocalY;
        const float Z = Height(X, Y);
        Vertices.Add(FVector(LocalX, LocalY, Z));
        const float Dx = Height(X + 100.0f, Y) - Height(X - 100.0f, Y);
        const float Dy = Height(X, Y + 100.0f) - Height(X, Y - 100.0f);
        Normals.Add(FVector(-Dx / 200.0f, -Dy / 200.0f, 1.0f).GetSafeNormal());
        // M_AshGround already multiplies UVs by 3.5/4.0. Feed it a roughly
        // 2-metre source repeat instead of making a visible sub-metre grid.
        UVs.Add(FVector2D(LocalX / 700.0f, LocalY / 800.0f));
        Colors.Add(FLinearColor::White);
        Tangents.Add(FProcMeshTangent(1.0f, 0.0f, Dx / 200.0f));
    }
    for (int32 J = 0; J < TileSteps; ++J)
    for (int32 I = 0; I < TileSteps; ++I)
    {
        const int32 A = J * Width + I;
        const int32 B = A + 1;
        const int32 D = A + Width;
        const int32 C = D + 1;
        // Unreal's procedural front face is opposite the OBJ winding used by
        // the imported valley. Face the lit side upward rather than relying on
        // the terrain material's two-sided fallback, which renders almost black.
        Indices.Add(A); Indices.Add(C); Indices.Add(B);
        Indices.Add(A); Indices.Add(D); Indices.Add(C);
    }
    Tile.Ground->CreateMeshSection_LinearColor(0, Vertices, Indices, Normals, UVs,
        Colors, Tangents, true);
    Tile.Ground->SetMaterial(0, GroundMaterial);
    FRandomStream Random(TileSeed(Key));
    Tile.Rocks = MakeFoliage(Key, TEXT("Rocks"), RockMesh, true);
    Tile.Trees = MakeFoliage(Key, TEXT("Trees"), TreeMesh, false);
    Tile.Ferns = MakeFoliage(Key, TEXT("Ferns"), FernMesh, false);
    Tile.Grass = MakeFoliage(Key, TEXT("Grass"), GrassMesh, false);
    PlaceFoliage(Tile.Rocks, Random, Key, 26, 100.0f, 450.0f, 1500.0f);
    PlaceFoliage(Tile.Trees, Random, Key, 24, 360.0f, 880.0f, 1250.0f);
    PlaceFoliage(Tile.Ferns, Random, Key, 65, 45.0f, 135.0f, 900.0f);
    PlaceFoliage(Tile.Grass, Random, Key, 155, 28.0f, 82.0f, 300.0f);
    Tiles.Add(Key, Tile);
    UE_LOG(LogTemp, Display, TEXT("ASHBOUND_EXPANSE tile=%d,%d vertices=%d rocks=%d trees=%d ferns=%d grass=%d"),
        Key.X, Key.Y, Vertices.Num(), Tile.Rocks->GetInstanceCount(),
        Tile.Trees->GetInstanceCount(), Tile.Ferns->GetInstanceCount(),
        Tile.Grass->GetInstanceCount());
}

void AASHBOUNDExpanse::RemoveTile(const FIntPoint& Key)
{
    FTile Tile;
    if (!Tiles.RemoveAndCopyValue(Key, Tile)) return;
    if (Tile.Ground) Tile.Ground->DestroyComponent();
    if (Tile.Rocks) Tile.Rocks->DestroyComponent();
    if (Tile.Trees) Tile.Trees->DestroyComponent();
    if (Tile.Ferns) Tile.Ferns->DestroyComponent();
    if (Tile.Grass) Tile.Grass->DestroyComponent();
}

void AASHBOUNDExpanse::Refresh(const FVector& PlayerPosition)
{
    if (PlayerPosition.X < EastEdge - 3500.0f)
    {
        TArray<FIntPoint> Existing;
        Tiles.GetKeys(Existing);
        for (const FIntPoint& Key : Existing) RemoveTile(Key);
        return;
    }
    const int32 X = FMath::Max(0, FMath::FloorToInt((PlayerPosition.X - EastEdge) / TileSize));
    const int32 Y = FMath::FloorToInt(PlayerPosition.Y / TileSize);
    TArray<FIntPoint> Remove;
    for (const TPair<FIntPoint, FTile>& Existing : Tiles)
        if (FMath::Abs(Existing.Key.X - X) > ActiveRadius ||
            FMath::Abs(Existing.Key.Y - Y) > ActiveRadius)
            Remove.Add(Existing.Key);
    for (const FIntPoint& Key : Remove) RemoveTile(Key);
    for (int32 J = Y - ActiveRadius; J <= Y + ActiveRadius; ++J)
    for (int32 I = FMath::Max(0, X - ActiveRadius); I <= X + ActiveRadius; ++I)
        CreateTile(FIntPoint(I, J));
}

void AASHBOUNDExpanse::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);
    RefreshClock += DeltaSeconds;
    if (RefreshClock < 0.8f || bQaPending) return;
    RefreshClock = 0.0f;
    const APawn* Player = UGameplayStatics::GetPlayerPawn(this, 0);
    if (Player) Refresh(Player->GetActorLocation());
}

void AASHBOUNDExpanse::RunGroundQa()
{
#if !UE_BUILD_SHIPPING
    const FVector Probe(EastEdge + 3500.0f, 0.0f, 0.0f);
    FHitResult Hit;
    const bool bTile = Tiles.Contains(FIntPoint(0, 0));
    const float Expected = Height(Probe.X, Probe.Y);
    const bool bHit = GetWorld()->LineTraceSingleByChannel(Hit,
        Probe + FVector(0, 0, 2000), Probe - FVector(0, 0, 2000), ECC_Visibility);
    const bool bPass = bTile && bHit && FMath::Abs(Hit.ImpactPoint.Z - Expected) < 80.0f;
    UE_LOG(LogTemp, Display, TEXT("ASHBOUND_EXPANSE_QA pass=%d tile=%d hit=%d expected=%.1f actual=%.1f"),
        bPass ? 1 : 0, bTile ? 1 : 0, bHit ? 1 : 0, Expected,
        bHit ? Hit.ImpactPoint.Z : -9999.0f);
    if (!bPass) UE_LOG(LogTemp, Error, TEXT("ASHBOUND_EXPANSE_QA FAIL"));
    bQaPending = false;
#endif
}
