#include "ASHBOUNDRebirthPopulation.h"

#include "Components/HierarchicalInstancedStaticMeshComponent.h"
#include "Components/SceneComponent.h"
#include "Engine/StaticMesh.h"
#include "Engine/World.h"
#include "GameFramework/PlayerController.h"
#include "HAL/FileManager.h"
#include "Materials/MaterialInterface.h"
#include "Misc/CommandLine.h"
#include "Misc/Parse.h"
#include "Misc/Paths.h"
#include "TimerManager.h"
#include "UnrealClient.h"

AASHBOUNDRebirthPopulation::AASHBOUNDRebirthPopulation()
{
    PrimaryActorTick.bCanEverTick = false;
    RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
    RootComponent->SetMobility(EComponentMobility::Static);
    Rocks = CreateDefaultSubobject<UHierarchicalInstancedStaticMeshComponent>(TEXT("Rocks"));
    Ferns = CreateDefaultSubobject<UHierarchicalInstancedStaticMeshComponent>(TEXT("Ferns"));
    Grasses = CreateDefaultSubobject<UHierarchicalInstancedStaticMeshComponent>(TEXT("Grasses"));
    Stumps = CreateDefaultSubobject<UHierarchicalInstancedStaticMeshComponent>(TEXT("Stumps"));
    Pines = CreateDefaultSubobject<UHierarchicalInstancedStaticMeshComponent>(TEXT("Pines"));
    for (UHierarchicalInstancedStaticMeshComponent* Component : {Rocks.Get(), Ferns.Get(), Grasses.Get(), Stumps.Get(), Pines.Get()})
    {
        Component->SetupAttachment(RootComponent);
        Component->SetMobility(EComponentMobility::Static);
    }
    Ferns->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    Grasses->SetCollisionEnabled(ECollisionEnabled::NoCollision);

    auto AddVariant = [this](FName Name, TArray<TObjectPtr<UHierarchicalInstancedStaticMeshComponent>>& Group,
                             bool bCollision)
    {
        UHierarchicalInstancedStaticMeshComponent* Component =
            CreateDefaultSubobject<UHierarchicalInstancedStaticMeshComponent>(Name);
        Component->SetupAttachment(RootComponent);
        Component->SetMobility(EComponentMobility::Static);
        if (!bCollision) Component->SetCollisionEnabled(ECollisionEnabled::NoCollision);
        Group.Add(Component);
    };
    for (FName Name : {FName(TEXT("FernA")), FName(TEXT("FernC")), FName(TEXT("FernD"))})
        AddVariant(Name, FernVariants, false);
    for (FName Name : {FName(TEXT("GrassSmallB")), FName(TEXT("GrassMidA")), FName(TEXT("GrassMidC")),
                       FName(TEXT("GrassLargeA")), FName(TEXT("GrassTallC")), FName(TEXT("GrassTinyD"))})
        AddVariant(Name, GrassVariants, false);
    for (FName Name : {FName(TEXT("FirB")), FName(TEXT("FirC")),
                       FName(TEXT("PineA")), FName(TEXT("PineB"))})
        AddVariant(Name, TreeVariants, true);
    for (FName Name : {FName(TEXT("MossRock1")), FName(TEXT("MossRock3")),
                       FName(TEXT("MossRock5"))})
        AddVariant(Name, MossRockVariants, true);
    for (FName Name : {FName(TEXT("GazaniaG")), FName(TEXT("GazaniaH")),
                       FName(TEXT("EmpodiumA")), FName(TEXT("EmpodiumC"))})
        AddVariant(Name, FlowerVariants, false);
}

int32 AASHBOUNDRebirthPopulation::Scatter(const TArray<UHierarchicalInstancedStaticMeshComponent*>& Targets,
    int32 Count, float RadiusCm, float HeightCm, float EmbedFraction,
    float MinNormalZ, int32 Habitat, FRandomStream& Random)
{
    if (Targets.IsEmpty() || !GetWorld()) return 0;
    int32 Added = 0;
    int32 CustomDataFailures = 0;
    FCollisionQueryParams Params(SCENE_QUERY_STAT(ASHBOUNDRebirthGround), false, this);
    for (int32 Attempt = 0; Attempt < Count * 8 && Added < Count; ++Attempt)
    {
        // The entry vista faces -X. Let the first flower meadow be discoverable
        // on foot instead of distributing every bloom behind the player.
        const float Angle = Habitat == 4 ? Random.FRandRange(PI - 1.15f, PI + 1.15f) :
            Random.FRandRange(0.0f, 2.0f * PI);
        const float Distance = Habitat == 4 ? Random.FRandRange(500.0f, RadiusCm) :
            RadiusCm * FMath::Sqrt(Random.FRand());
        if ((Habitat == 3 && Distance < 1400.0f) ||
            (Habitat == 0 && Distance < 450.0f)) continue;
        const FVector XY = GetActorLocation() + FVector(FMath::Cos(Angle) * Distance,
                                                       FMath::Sin(Angle) * Distance, 0.0f);
        const FVector2D Local(XY.X - GetActorLocation().X, XY.Y - GetActorLocation().Y);
        // Two spatial scales form connected clearings, thickets and meadow
        // patches. A random yaw alone cannot create a convincing habitat.
        const float Broad = FMath::PerlinNoise2D((Local + FVector2D(3117, -811)) * 0.00042f);
        const float Fine = FMath::PerlinNoise2D((Local + FVector2D(-1701, 2549)) * 0.0018f);
        const float Field = Broad * 0.72f + Fine * 0.28f;
        const float Threshold = Habitat == 4 ? 0.005f :
                                Habitat == 3 ? 0.065f :
                                Habitat == 2 ? 0.02f :
                                Habitat == 1 ? -0.075f : -0.25f;
        if (Field < Threshold) continue;
        if (Habitat == 1 && Random.FRand() > FMath::Clamp((Field + 0.15f) * 2.7f, 0.10f, 1.0f)) continue;
        FHitResult Hit;
        if (!GetWorld()->LineTraceSingleByChannel(Hit, XY + FVector(0, 0, 50000),
                                                   XY - FVector(0, 0, 50000),
                                                   ECC_Visibility, Params) ||
            Hit.ImpactNormal.Z < MinNormalZ)
        {
            continue;
        }
        UHierarchicalInstancedStaticMeshComponent* Target = Targets[Random.RandRange(0, Targets.Num() - 1)];
        const UStaticMesh* Mesh = Target->GetStaticMesh();
        if (!Mesh) continue;
        const FBox Box = Mesh->GetBoundingBox();
        const float MeshHeight = FMath::Max(1.0f, Box.Max.Z - Box.Min.Z);
        const float Size = HeightCm * Random.FRandRange(0.56f, 1.48f);
        const float Scale = Size / MeshHeight;
        const float Yaw = Random.FRandRange(0.0f, 360.0f);
        const float Lean = Habitat == 3 ? 3.0f : 9.0f;
        const FRotator Rotation(Random.FRandRange(-Lean, Lean), Yaw,
                                Random.FRandRange(-Lean, Lean));
        const float Width = Random.FRandRange(0.82f, 1.18f);
        const FVector InstanceScale(Scale * Width, Scale / Width, Scale);
        const FVector Offset = Rotation.RotateVector(FVector((Box.Min.X + Box.Max.X) * 0.5f,
            (Box.Min.Y + Box.Max.Y) * 0.5f, 0) * InstanceScale);
        const FVector Position = Hit.ImpactPoint - Offset -
            FVector(0, 0, (Box.Min.Z + MeshHeight * EmbedFraction) * Scale);
        const int32 InstanceIndex = Target->AddInstance(FTransform(Rotation, Position, InstanceScale), true);
        if (InstanceIndex < 0) continue;
        if (Habitat == 1 || Habitat == 2 || Habitat == 5)
        {
            // A plant keeps its own vigor and wind phase. Vigor is tied to
            // this site's habitat field, with a small individual variation.
            const float Vigor = FMath::Clamp(0.86f + Field * 0.25f +
                Random.FRandRange(-0.07f, 0.07f), 0.72f, 1.04f);
            const float PlantState[2] = {Vigor, Random.FRandRange(0.0f, 2.0f * PI)};
            if (!Target->SetCustomData(InstanceIndex, MakeArrayView(PlantState), false))
                ++CustomDataFailures;
        }
        ++Added;
    }
    if (CustomDataFailures)
        UE_LOG(LogTemp, Error, TEXT("ASHBOUND_REBIRTH_PLANT_STATE_FAILED habitat=%d count=%d"),
            Habitat, CustomDataFailures);
    return Added;
}

void AASHBOUNDRebirthPopulation::BeginPlay()
{
    Super::BeginPlay();
    // The importer runs after the editor module first loads. Resolve the
    // authored assets when play begins; constructor-time hard loads would run
    // before the fresh-project import and leave empty mesh defaults.
    Rocks->SetStaticMesh(LoadObject<UStaticMesh>(nullptr,
        TEXT("/Game/ASHBOUND/Models/boulder_01/boulder_01_1k/StaticMeshes/boulder_01_1k.boulder_01_1k")));
    Ferns->SetStaticMesh(LoadObject<UStaticMesh>(nullptr,
        TEXT("/Game/ASHBOUND/Models/fern_02/fern_02_1k/StaticMeshes/fern_02_b.fern_02_b")));
    Grasses->SetStaticMesh(LoadObject<UStaticMesh>(nullptr,
        TEXT("/Game/ASHBOUND/Models/grass_medium_01/grass_medium_01_1k/StaticMeshes/grass_medium_01_small_a_LOD0.grass_medium_01_small_a_LOD0")));
    Stumps->SetStaticMesh(LoadObject<UStaticMesh>(nullptr,
        TEXT("/Game/ASHBOUND/Models/tree_stump_01/tree_stump_01_1k/StaticMeshes/tree_stump_01_1k.tree_stump_01_1k")));
    Pines->SetStaticMesh(LoadObject<UStaticMesh>(nullptr,
        TEXT("/Game/ASHBOUND/Models/fir_sapling/fir_sapling_1k/StaticMeshes/fir_sapling_a.fir_sapling_a")));
    const TCHAR* FernNames[] = {TEXT("fern_02_a"), TEXT("fern_02_c"), TEXT("fern_02_d")};
    for (int32 I = 0; I < FernVariants.Num(); ++I)
        FernVariants[I]->SetStaticMesh(LoadObject<UStaticMesh>(nullptr,
            *FString::Printf(TEXT("/Game/ASHBOUND/Models/fern_02/fern_02_1k/StaticMeshes/%s.%s"), FernNames[I], FernNames[I])));
    const TCHAR* GrassNames[] = {TEXT("grass_medium_01_small_b_LOD0"), TEXT("grass_medium_01_mid_a_LOD0"),
        TEXT("grass_medium_01_mid_c_LOD0"), TEXT("grass_medium_01_large_a_LOD0"),
        TEXT("grass_medium_01_tall_c_LOD0"), TEXT("grass_medium_01_tiny_d_LOD0")};
    for (int32 I = 0; I < GrassVariants.Num(); ++I)
        GrassVariants[I]->SetStaticMesh(LoadObject<UStaticMesh>(nullptr,
            *FString::Printf(TEXT("/Game/ASHBOUND/Models/grass_medium_01/grass_medium_01_1k/StaticMeshes/%s.%s"), GrassNames[I], GrassNames[I])));
    const TCHAR* TreeModels[] = {TEXT("fir_sapling"), TEXT("fir_sapling"),
        TEXT("pine_sapling_small"), TEXT("pine_sapling_small")};
    const TCHAR* TreeNames[] = {TEXT("fir_sapling_b"), TEXT("fir_sapling_c"),
        TEXT("pine_sapling_small_a"), TEXT("pine_sapling_small_b")};
    for (int32 I = 0; I < TreeVariants.Num(); ++I)
        TreeVariants[I]->SetStaticMesh(LoadObject<UStaticMesh>(nullptr,
            *FString::Printf(TEXT("/Game/ASHBOUND/Models/%s/%s_1k/StaticMeshes/%s.%s"),
                TreeModels[I], TreeModels[I], TreeNames[I], TreeNames[I])));
    const TCHAR* MossNames[] = {TEXT("rock_moss_set_01_rock01"), TEXT("rock_moss_set_01_rock03"),
        TEXT("rock_moss_set_01_rock05")};
    for (int32 I = 0; I < MossRockVariants.Num(); ++I)
        MossRockVariants[I]->SetStaticMesh(LoadObject<UStaticMesh>(nullptr,
            *FString::Printf(TEXT("/Game/ASHBOUND/Models/rock_moss_set_01/rock_moss_set_01_1k/StaticMeshes/%s.%s"),
                MossNames[I], MossNames[I])));
    const TCHAR* FlowerModels[] = {TEXT("flower_gazania"), TEXT("flower_gazania"),
        TEXT("flower_empodium"), TEXT("flower_empodium")};
    const TCHAR* FlowerNames[] = {TEXT("flower_gazania_g_LOD0"), TEXT("flower_gazania_h_LOD0"),
        TEXT("flower_empodium_a_LOD0"), TEXT("flower_empodium_c_LOD0")};
    for (int32 I = 0; I < FlowerVariants.Num(); ++I)
        FlowerVariants[I]->SetStaticMesh(LoadObject<UStaticMesh>(nullptr,
            *FString::Printf(TEXT("/Game/ASHBOUND/Models/%s/%s_1k/StaticMeshes/%s.%s"),
                FlowerModels[I], FlowerModels[I], FlowerNames[I], FlowerNames[I])));
    TArray<UHierarchicalInstancedStaticMeshComponent*> RockGroup{Rocks.Get()};
    TArray<UHierarchicalInstancedStaticMeshComponent*> FernGroup{Ferns.Get()};
    TArray<UHierarchicalInstancedStaticMeshComponent*> GrassGroup{Grasses.Get()};
    TArray<UHierarchicalInstancedStaticMeshComponent*> TreeGroup{Pines.Get()};
    TArray<UHierarchicalInstancedStaticMeshComponent*> MossGroup;
    TArray<UHierarchicalInstancedStaticMeshComponent*> FlowerGroup;
    for (const auto& Component : FernVariants) FernGroup.Add(Component.Get());
    for (const auto& Component : GrassVariants) GrassGroup.Add(Component.Get());
    for (const auto& Component : TreeVariants) TreeGroup.Add(Component.Get());
    for (const auto& Component : MossRockVariants) MossGroup.Add(Component.Get());
    for (const auto& Component : FlowerVariants) FlowerGroup.Add(Component.Get());
    for (UHierarchicalInstancedStaticMeshComponent* Component : FernGroup)
        Component->SetNumCustomDataFloats(2);
    for (UHierarchicalInstancedStaticMeshComponent* Component : GrassGroup)
        Component->SetNumCustomDataFloats(2);
    UMaterialInterface* FernWind = LoadObject<UMaterialInterface>(nullptr,
        TEXT("/Game/ASHBOUND/Materials/M_RebirthFern.M_RebirthFern"));
    UMaterialInterface* GrassWind = LoadObject<UMaterialInterface>(nullptr,
        TEXT("/Game/ASHBOUND/Materials/M_RebirthGrass.M_RebirthGrass"));
    if (FernWind)
        for (UHierarchicalInstancedStaticMeshComponent* Component : FernGroup)
            Component->SetMaterial(0, FernWind);
    if (GrassWind)
        for (UHierarchicalInstancedStaticMeshComponent* Component : GrassGroup)
            Component->SetMaterial(0, GrassWind);
    UE_LOG(LogTemp, Display, TEXT("ASHBOUND_REBIRTH_WIND fern=%d grass=%d"),
        FernWind ? 1 : 0, GrassWind ? 1 : 0);
    FRandomStream Random(20261015);
    const bool RocksOnly = FParse::Param(FCommandLine::Get(), TEXT("ashboundrocksonly"));
    const int32 RockCount = Scatter(RockGroup, 45, 12500, 220, 0.20f, 0.55f, 0, Random);
    const int32 MossCount = RocksOnly ? 0 : Scatter(MossGroup, 260, 10500, 100, 0.12f, 0.70f, 0, Random);
    const int32 FernCount = RocksOnly ? 0 : Scatter(FernGroup, 1300, 10500, 95, 0.06f, 0.72f, 2, Random);
    const int32 GrassCount = RocksOnly ? 0 : Scatter(GrassGroup, 45000, 10500, 52, 0.04f, 0.76f, 1, Random);
    // Short clumps overlap near the player; the broad layer can stay taller.
    // Several independently rotated blades per instanced mesh create the
    // appearance of individual grass without one Actor per blade.
    const int32 NearGrassCount = RocksOnly ? 0 : Scatter(GrassGroup, 24000, 1800, 27, 0.05f, 0.77f, 5, Random);
    const int32 FlowerCount = RocksOnly ? 0 : Scatter(FlowerGroup, 2600, 6500, 33, 0.04f, 0.79f, 4, Random);
    const int32 StumpCount = RocksOnly ? 0 : Scatter({Stumps.Get()}, 30, 11000, 190, 0.08f, 0.65f, 0, Random);
    const int32 TreeCount = RocksOnly ? 0 : Scatter(TreeGroup, 410, 13500, 820, 0.03f, 0.69f, 3, Random);
    UE_LOG(LogTemp, Display, TEXT("ASHBOUND_REBIRTH_HABITAT rocks=%d moss=%d ferns=%d grass=%d near_grass=%d flowers=%d stumps=%d trees=%d"),
        RockCount, MossCount, FernCount, GrassCount, NearGrassCount, FlowerCount, StumpCount, TreeCount);
    if (FParse::Param(FCommandLine::Get(), TEXT("ashboundshot")))
    {
        float ScreenshotDelay = 8.0f;
        FParse::Value(FCommandLine::Get(), TEXT("ashboundshotdelay="), ScreenshotDelay);
        ScreenshotDelay = FMath::Clamp(ScreenshotDelay, 1.0f, 120.0f);
        FTimerHandle ScreenshotTimer;
        GetWorldTimerManager().SetTimer(ScreenshotTimer, FTimerDelegate::CreateLambda([this]()
        {
            if (APlayerController* Controller = GetWorld()->GetFirstPlayerController())
            {
                FVector ViewLocation;
                FRotator ViewRotation;
                Controller->GetPlayerViewPoint(ViewLocation, ViewRotation);
                FHitResult Ground;
                FCollisionQueryParams GroundQuery(SCENE_QUERY_STAT(ASHBOUNDRebirthCameraGround), false, this);
                const bool GroundFound = GetWorld()->LineTraceSingleByChannel(
                    Ground, ViewLocation + FVector(0, 0, 50000),
                    ViewLocation - FVector(0, 0, 50000), ECC_Visibility, GroundQuery);
                UE_LOG(LogTemp, Display, TEXT("ASHBOUND_REBIRTH_CAMERA location=%s rotation=%s ground_z=%f hit=%d"),
                    *ViewLocation.ToString(), *ViewRotation.ToString(),
                    GroundFound ? Ground.ImpactPoint.Z : 0.0f, GroundFound ? 1 : 0);
            }
            const FString File = FPaths::ProjectSavedDir() / TEXT("Screenshots/Rebirth.png");
            IFileManager::Get().MakeDirectory(*FPaths::GetPath(File), true);
            FScreenshotRequest::RequestScreenshot(File, false, false);
            UE_LOG(LogTemp, Display, TEXT("ASHBOUND_REBIRTH_SCREENSHOT_REQUEST %s"), *File);
        }), ScreenshotDelay, false);
    }
}
