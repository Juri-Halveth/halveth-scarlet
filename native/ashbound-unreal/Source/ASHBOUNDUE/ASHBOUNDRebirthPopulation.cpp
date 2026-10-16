#include "ASHBOUNDRebirthPopulation.h"
#include "ASHBOUNDGenesisEcology.h"
#include "ASHBOUNDSoil.h"

#include "Components/HierarchicalInstancedStaticMeshComponent.h"
#include "Components/SceneComponent.h"
#include "Engine/StaticMesh.h"
#include "Engine/World.h"
#include "EngineUtils.h"
#include "GameFramework/PlayerController.h"
#include "GameFramework/Pawn.h"
#include "HAL/FileManager.h"
#include "LandscapeProxy.h"
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
    BroadleafTrees = CreateDefaultSubobject<UHierarchicalInstancedStaticMeshComponent>(TEXT("BroadleafTrees"));
    Shrubs = CreateDefaultSubobject<UHierarchicalInstancedStaticMeshComponent>(TEXT("Shrubs"));
    for (UHierarchicalInstancedStaticMeshComponent* Component : {Rocks.Get(), Ferns.Get(), Grasses.Get(), Stumps.Get(), Pines.Get(), BroadleafTrees.Get(), Shrubs.Get()})
    {
        Component->SetupAttachment(RootComponent);
        Component->SetMobility(EComponentMobility::Static);
    }
    Ferns->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    Grasses->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    Shrubs->SetCollisionEnabled(ECollisionEnabled::NoCollision);

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
    for (FName Name : {FName(TEXT("ShrubB")), FName(TEXT("ShrubC")), FName(TEXT("ShrubD"))})
        AddVariant(Name, ShrubVariants, false);
}

int32 AASHBOUNDRebirthPopulation::Scatter(const TArray<UHierarchicalInstancedStaticMeshComponent*>& Targets,
    int32 Count, float RadiusCm, float HeightCm, float EmbedFraction,
    float MinNormalZ, int32 Habitat, FRandomStream& Random)
{
    if (Targets.IsEmpty() || !GetWorld()) return 0;
    int32 Added = 0;
    int32 CustomDataFailures = 0;
    int32 FieldPasses = 0;
    int32 GroundHits = 0;
    int32 NormalPasses = 0;
    int32 MissingMeshes = 0;
    int32 SoilPasses = 0;
    FCollisionQueryParams Params(SCENE_QUERY_STAT(ASHBOUNDRebirthGround), false, this);
    ALandscapeProxy* GenesisLandscape = nullptr;
    if (bGenesisMode)
    {
        for (TActorIterator<AASHBOUNDRebirthPopulation> It(GetWorld()); It; ++It)
            Params.AddIgnoredActor(*It);
        for (TActorIterator<ALandscapeProxy> It(GetWorld()); It; ++It)
        {
            GenesisLandscape = *It;
            break;
        }
        if (!GenesisLandscape) return 0;
    }
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
        const float HalfCell = bGenesisMacroCell ? 10000.0f : 2500.0f;
        const FVector XY = bGenesisMode
            ? ScatterCenter + FVector(Random.FRandRange(-HalfCell, HalfCell),
                                      Random.FRandRange(-HalfCell, HalfCell), 0.0f)
            : ScatterCenter + FVector(FMath::Cos(Angle) * Distance,
                                      FMath::Sin(Angle) * Distance, 0.0f);
        const FVector2D Local = bGenesisMode ? FVector2D(XY.X, XY.Y) :
            FVector2D(XY.X - ScatterCenter.X, XY.Y - ScatterCenter.Y);
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
        ++FieldPasses;
        if (Habitat == 1 && Random.FRand() > FMath::Clamp((Field + 0.15f) * 2.7f, 0.10f, 1.0f)) continue;
        FVector GroundPoint;
        FVector GroundNormal;
        if (bGenesisMode)
        {
            // The first visibility hit may be a canopy, building or rock. The
            // authored landscape height is the ground this cell must occupy.
            const TOptional<float> Height = GenesisLandscape->GetHeightAtLocation(XY);
            if (!Height.IsSet()) continue;
            GroundPoint = FVector(XY.X, XY.Y, Height.GetValue());
            constexpr float SampleStep = 100.0f;
            const TOptional<float> Left = GenesisLandscape->GetHeightAtLocation(XY + FVector(-SampleStep, 0, 0));
            const TOptional<float> Right = GenesisLandscape->GetHeightAtLocation(XY + FVector(SampleStep, 0, 0));
            const TOptional<float> Back = GenesisLandscape->GetHeightAtLocation(XY + FVector(0, -SampleStep, 0));
            const TOptional<float> Front = GenesisLandscape->GetHeightAtLocation(XY + FVector(0, SampleStep, 0));
            GroundNormal = Left.IsSet() && Right.IsSet() && Back.IsSet() && Front.IsSet()
                ? FVector((Left.GetValue() - Right.GetValue()) / (2.0f * SampleStep),
                          (Back.GetValue() - Front.GetValue()) / (2.0f * SampleStep), 1.0f).GetSafeNormal()
                : FVector::UpVector;
        }
        else
        {
            FHitResult Hit;
            if (!GetWorld()->LineTraceSingleByChannel(Hit, XY + FVector(0, 0, 50000),
                                                       XY - FVector(0, 0, 50000),
                                                       ECC_Visibility, Params))
                continue;
            GroundPoint = Hit.ImpactPoint;
            GroundNormal = Hit.ImpactNormal;
        }
        ++GroundHits;
        if (GroundNormal.Z < MinNormalZ) continue;
        ++NormalPasses;
        if (bGenesisMode)
        {
            const FASHBOUNDSoilProfile Soil = FASHBOUNDSoil::Sample(
                GroundPoint, GroundNormal, SoilDayOfYear);
            float Suitability = 1.0f;
            switch (Habitat)
            {
            case 0: // Exposed mineral and shallow bedrock invite loose stone.
                Suitability = FMath::Clamp(1.15f - Soil.RootCapacity, 0.2f, 1.0f);
                break;
            case 1: // Grasses need some rooted soil but tolerate dry patches.
                Suitability = 0.35f + 0.65f * Soil.RootCapacity;
                break;
            case 2: // Ferns and shrubs favor moist, developed soil.
                Suitability = FMath::Clamp((Soil.Moisture - 0.22f) * 2.0f,
                    0.0f, 1.0f) * (0.35f + 0.65f * Soil.RootCapacity);
                break;
            case 3: // Trees need both a mineral horizon and root space.
                Suitability = Soil.MineralCm < 40.0f ? 0.0f : Soil.RootCapacity;
                break;
            case 4: // Open, lit soil supports flowers.
                Suitability = FMath::Clamp((Soil.SolarExposure - 0.3f) * 2.0f,
                    0.0f, 1.0f) * (0.3f + 0.7f * Soil.RootCapacity);
                break;
            default:
                break;
            }
            if (Random.FRand() > Suitability) continue;
            ++SoilPasses;
        }
        // Rocky altitude gradually thins roots; it does not impose an abrupt
        // world-height cutoff that empties whole biomes.
        if (bGenesisMode && Habitat != 0)
        {
            const float Rockiness = FMath::Clamp((GroundPoint.Z - 5500.0f) / 4500.0f,
                                                  0.0f, 1.0f);
            const float MinimumDensity = Habitat == 3 ? 0.04f : 0.18f;
            if (Random.FRand() > FMath::Lerp(1.0f, MinimumDensity, Rockiness)) continue;
        }
        UHierarchicalInstancedStaticMeshComponent* Target = Targets[Random.RandRange(0, Targets.Num() - 1)];
        const UStaticMesh* Mesh = Target->GetStaticMesh();
        if (!Mesh)
        {
            ++MissingMeshes;
            continue;
        }
        const FBox Box = Mesh->GetBoundingBox();
        const float MeshHeight = FMath::Max(1.0f, Box.Max.Z - Box.Min.Z);
        const float Size = HeightCm * Random.FRandRange(0.56f, 1.48f);
        const float Scale = Size / MeshHeight;
        const float Yaw = Random.FRandRange(0.0f, 360.0f);
        const float Lean = Habitat == 3 ? 3.0f : 9.0f;
        // Let rocks settle into the terrain while plants remain mostly upright.
        // A ground normal is local to this site, so adjacent instances can
        // meet different slopes without rotating an entire cell as a sheet.
        const FQuat GroundTilt = FQuat::FindBetweenNormals(
            FVector::UpVector, GroundNormal.GetSafeNormal());
        const float TiltWeight = Habitat == 0 ? 1.0f : Habitat == 3 ? 0.12f : 0.32f;
        const FQuat Rotation = (FQuat::Slerp(FQuat::Identity, GroundTilt, TiltWeight) *
            FQuat(FVector::UpVector, FMath::DegreesToRadians(Yaw)) *
            FRotator(Random.FRandRange(-Lean, Lean), 0.0f,
                     Random.FRandRange(-Lean, Lean)).Quaternion()).GetNormalized();
        const float Width = Random.FRandRange(0.82f, 1.18f);
        const FVector InstanceScale(Scale * Width, Scale / Width, Scale);
        // Rotate the complete scaled contact point, including its vertical
        // offset. Subtracting only a world-Z offset lifts tilted meshes off
        // their traced ground and visibly makes rocks/vegetation hover.
        const FVector LocalContact((Box.Min.X + Box.Max.X) * 0.5f,
            (Box.Min.Y + Box.Max.Y) * 0.5f,
            Box.Min.Z + MeshHeight * EmbedFraction);
        const FVector Position = GroundPoint -
            Rotation.RotateVector(LocalContact * InstanceScale);
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
    if (bGenesisMode && (Habitat == 0 || Habitat == 1))
        UE_LOG(LogTemp, Display,
            TEXT("ASHBOUND_GENESIS_CELL_PROBE center=%s habitat=%d field=%d ground=%d normal=%d soil=%d missing_mesh=%d added=%d"),
            *ScatterCenter.ToString(), Habitat, FieldPasses, GroundHits,
            NormalPasses, SoilPasses, MissingMeshes, Added);
    return Added;
}

void AASHBOUNDRebirthPopulation::BeginPlay()
{
    Super::BeginPlay();
    bGenesisMode = GetWorld() &&
        (GetWorld()->GetMapName().Contains(TEXT("GenesisWorld")) ||
         GetWorld()->GetMapName().Contains(TEXT("GenesisHalfStepWorld")));
    if (bGenesisMode)
        for (TActorIterator<AASHBOUNDGenesisEcology> It(GetWorld()); It; ++It)
        {
            SoilDayOfYear = It->GetDayOfYear();
            break;
        }
    ScatterCenter = GetActorLocation();
    if (bGenesisMode)
    {
        // Cells spawned after play begins cannot change a registered Static
        // mesh component. Make only these transient cell components Movable.
        RootComponent->SetMobility(EComponentMobility::Movable);
        for (UHierarchicalInstancedStaticMeshComponent* Component :
            {Rocks.Get(), Ferns.Get(), Grasses.Get(), Stumps.Get(), Pines.Get(), BroadleafTrees.Get(), Shrubs.Get()})
            Component->SetMobility(EComponentMobility::Movable);
        for (auto& Group : {&FernVariants, &GrassVariants, &TreeVariants,
                            &MossRockVariants, &FlowerVariants, &ShrubVariants})
            for (auto& Component : *Group)
                Component->SetMobility(EComponentMobility::Movable);
        auto CullGroup = [](UHierarchicalInstancedStaticMeshComponent* Component,
                            int32 EndCm, bool bShadow)
        {
            Component->SetCullDistances(0, EndCm);
            Component->SetCastShadow(bShadow);
        };
        CullGroup(Rocks, 30000, true);
        CullGroup(Stumps, 22000, true);
        CullGroup(Ferns, 12000, false);
        CullGroup(Grasses, 9000, false);
        CullGroup(Shrubs, 18000, false);
        CullGroup(Pines, bGenesisMacroCell ? 35000 : 18000, false);
        CullGroup(BroadleafTrees, bGenesisMacroCell ? 35000 : 18000, false);
        for (auto& Group : {&FernVariants, &GrassVariants, &TreeVariants,
                            &MossRockVariants, &FlowerVariants, &ShrubVariants})
            for (auto& Component : *Group)
            {
                const bool bTree = Group == &TreeVariants;
                const bool bRock = Group == &MossRockVariants;
                const bool bGrass = Group == &GrassVariants;
                const bool bFern = Group == &FernVariants;
                const bool bFlower = Group == &FlowerVariants;
                CullGroup(Component, bTree ? (bGenesisMacroCell ? 35000 : 18000) : bRock ? 30000 :
                          bGrass ? 9000 : bFern ? 12000 : bFlower ? 11000 : 18000,
                          bRock);
            }
    }
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
    BroadleafTrees->SetStaticMesh(LoadObject<UStaticMesh>(nullptr,
        TEXT("/Game/ASHBOUND/Models/tree_small_02/tree_small_02_1k/StaticMeshes/tree_small_02_1k.tree_small_02_1k")));
    Shrubs->SetStaticMesh(LoadObject<UStaticMesh>(nullptr,
        TEXT("/Game/ASHBOUND/Models/shrub_02/shrub_02_1k/StaticMeshes/shrub_02_a.shrub_02_a")));
    const TCHAR* ShrubNames[] = {TEXT("shrub_02_b"), TEXT("shrub_02_c"), TEXT("shrub_02_d")};
    for (int32 I = 0; I < ShrubVariants.Num(); ++I)
        ShrubVariants[I]->SetStaticMesh(LoadObject<UStaticMesh>(nullptr,
            *FString::Printf(TEXT("/Game/ASHBOUND/Models/shrub_02/shrub_02_1k/StaticMeshes/%s.%s"),
                ShrubNames[I], ShrubNames[I])));
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
    TArray<UHierarchicalInstancedStaticMeshComponent*> ShrubGroup{Shrubs.Get()};
    TArray<UHierarchicalInstancedStaticMeshComponent*> MossGroup;
    TArray<UHierarchicalInstancedStaticMeshComponent*> FlowerGroup;
    for (const auto& Component : FernVariants) FernGroup.Add(Component.Get());
    for (const auto& Component : GrassVariants) GrassGroup.Add(Component.Get());
    for (const auto& Component : TreeVariants) TreeGroup.Add(Component.Get());
    for (const auto& Component : ShrubVariants) ShrubGroup.Add(Component.Get());
    for (const auto& Component : MossRockVariants) MossGroup.Add(Component.Get());
    for (const auto& Component : FlowerVariants) FlowerGroup.Add(Component.Get());
    for (UHierarchicalInstancedStaticMeshComponent* Component : FernGroup)
        Component->SetNumCustomDataFloats(2);
    for (UHierarchicalInstancedStaticMeshComponent* Component : GrassGroup)
        Component->SetNumCustomDataFloats(2);
    for (UHierarchicalInstancedStaticMeshComponent* Component : ShrubGroup)
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
    if (bGenesisMode)
    {
        const float CellWidth = bGenesisMacroCell ? 20000.0f : 5000.0f;
        const uint32 CellX = static_cast<uint32>(FMath::FloorToInt(ScatterCenter.X / CellWidth));
        const uint32 CellY = static_cast<uint32>(FMath::FloorToInt(ScatterCenter.Y / CellWidth));
        Random.Initialize(static_cast<int32>(20261015u ^ (CellX * 73856093u) ^ (CellY * 19349663u)));
    }
    const bool RocksOnly = FParse::Param(FCommandLine::Get(), TEXT("ashboundrocksonly"));
    const int32 RockCount = Scatter(RockGroup, bGenesisMode ? (bGenesisMacroCell ? 20 : 0) : 45,
        12500, 220, 0.50f, 0.55f, 0, Random);
    const int32 MossCount = RocksOnly ? 0 : Scatter(MossGroup, bGenesisMode ? (bGenesisMacroCell ? 80 : 0) : 260,
        10500, 100, 0.30f, 0.70f, 0, Random);
    const int32 FernCount = RocksOnly || (bGenesisMode && bGenesisMacroCell) ? 0 : Scatter(FernGroup, bGenesisMode ? 85 : 1300,
        10500, 95, 0.06f, 0.72f, 2, Random);
    const int32 GrassCount = RocksOnly || (bGenesisMode && bGenesisMacroCell) ? 0 : Scatter(GrassGroup, bGenesisMode ? 2100 : 45000,
        10500, 52, 0.04f, 0.76f, 1, Random);
    // Short clumps overlap near the player; the broad layer can stay taller.
    // Several independently rotated blades per instanced mesh create the
    // appearance of individual grass without one Actor per blade.
    const int32 NearGrassCount = RocksOnly || bGenesisMode ? 0 : Scatter(GrassGroup, 24000, 1800, 27, 0.05f, 0.77f, 5, Random);
    const int32 FlowerCount = RocksOnly || (bGenesisMode && bGenesisMacroCell) ? 0 : Scatter(FlowerGroup, bGenesisMode ? 34 : 2600,
        6500, 33, 0.04f, 0.79f, 4, Random);
    const int32 StumpCount = RocksOnly ? 0 : Scatter({Stumps.Get()}, bGenesisMode ? (bGenesisMacroCell ? 5 : 0) : 12,
        11000, 190, 0.08f, 0.65f, 0, Random);
    // Concentrate a smaller tree budget near the player instead of dotting
    // every distant macro cell with saplings. Cull near instances before their
    // cell unload boundary; macro cells retain a distant silhouette.
    const int32 PineCount = RocksOnly ? 0 : Scatter(TreeGroup, bGenesisMode ? (bGenesisMacroCell ? 6 : 2) : 65,
        13500, 820, 0.03f, 0.69f, 3, Random);
    const int32 BroadleafCount = RocksOnly ? 0 : Scatter({BroadleafTrees.Get()}, bGenesisMode ? (bGenesisMacroCell ? 6 : 2) : 34,
        13500, 850, 0.02f, 0.72f, 3, Random);
    const int32 ShrubCount = RocksOnly ? 0 : Scatter(ShrubGroup, bGenesisMode ? (bGenesisMacroCell ? 120 : 0) : 420,
        12500, 145, 0.08f, 0.73f, 2, Random);
    UE_LOG(LogTemp, Display, TEXT("ASHBOUND_REBIRTH_HABITAT rocks=%d moss=%d ferns=%d grass=%d near_grass=%d flowers=%d stumps=%d pines=%d broadleaf=%d shrubs=%d"),
        RockCount, MossCount, FernCount, GrassCount, NearGrassCount, FlowerCount, StumpCount, PineCount, BroadleafCount, ShrubCount);
    if (!bGenesisMode && FParse::Param(FCommandLine::Get(), TEXT("ashboundshot")))
    {
        float ShotX = 0.0f;
        float ShotY = 0.0f;
        const bool HasX = FParse::Value(FCommandLine::Get(), TEXT("ashboundshotx="), ShotX);
        const bool HasY = FParse::Value(FCommandLine::Get(), TEXT("ashboundshoty="), ShotY);
        if (HasX != HasY)
        {
            UE_LOG(LogTemp, Error, TEXT("ASHBOUND_REBIRTH_QA needs both shotx and shoty"));
        }
        else if (HasX && HasY)
        {
            FTimerHandle MoveTimer;
            GetWorldTimerManager().SetTimer(MoveTimer, FTimerDelegate::CreateLambda([this, ShotX, ShotY]()
            {
                FHitResult Ground;
                FCollisionQueryParams Query(SCENE_QUERY_STAT(ASHBOUNDRemoteTerrainProbe), false, this);
                const FVector Top(ShotX, ShotY, 50000.0f);
                const FVector Bottom(ShotX, ShotY, -50000.0f);
                const bool Found = GetWorld()->LineTraceSingleByChannel(
                    Ground, Top, Bottom, ECC_Visibility, Query);
                APlayerController* Controller = GetWorld()->GetFirstPlayerController();
                APawn* Pawn = Controller ? Controller->GetPawn() : nullptr;
                const bool Moved = Found && Pawn && Pawn->SetActorLocation(
                    Ground.ImpactPoint + FVector(0, 0, 200.0f), false, nullptr,
                    ETeleportType::TeleportPhysics);
                UE_LOG(LogTemp, Display,
                    TEXT("ASHBOUND_REBIRTH_REMOTE_GROUND x=%f y=%f hit=%d moved=%d z=%f normal_z=%f"),
                    ShotX, ShotY, Found ? 1 : 0, Moved ? 1 : 0,
                    Found ? Ground.ImpactPoint.Z : 0.0f,
                    Found ? Ground.ImpactNormal.Z : 0.0f);
            }), 2.0f, false);
        }
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
