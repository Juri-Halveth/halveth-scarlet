#include "ASHBOUNDRebirthPopulation.h"

#include "Components/HierarchicalInstancedStaticMeshComponent.h"
#include "Components/SceneComponent.h"
#include "Engine/StaticMesh.h"
#include "Engine/World.h"
#include "GameFramework/PlayerController.h"
#include "HAL/FileManager.h"
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
}

int32 AASHBOUNDRebirthPopulation::Scatter(UHierarchicalInstancedStaticMeshComponent* Target,
    int32 Count, float RadiusCm, float HeightCm, float EmbedFraction,
    float MinNormalZ, FRandomStream& Random)
{
    const UStaticMesh* Mesh = Target->GetStaticMesh();
    if (!Mesh || !GetWorld()) return 0;
    const FBox Box = Mesh->GetBoundingBox();
    const float MeshHeight = FMath::Max(1.0f, Box.Max.Z - Box.Min.Z);
    const float CentreX = (Box.Min.X + Box.Max.X) * 0.5f;
    const float CentreY = (Box.Min.Y + Box.Max.Y) * 0.5f;
    int32 Added = 0;
    FCollisionQueryParams Params(SCENE_QUERY_STAT(ASHBOUNDRebirthGround), false, this);
    for (int32 Attempt = 0; Attempt < Count * 3 && Added < Count; ++Attempt)
    {
        const float Angle = Random.FRandRange(0.0f, 2.0f * PI);
        const float Distance = RadiusCm * FMath::Sqrt(Random.FRand());
        if ((Target == Pines.Get() && Distance < 1000.0f) ||
            (Target == Rocks.Get() && Distance < 450.0f)) continue;
        const FVector XY = GetActorLocation() + FVector(FMath::Cos(Angle) * Distance,
                                                       FMath::Sin(Angle) * Distance, 0.0f);
        FHitResult Hit;
        if (!GetWorld()->LineTraceSingleByChannel(Hit, XY + FVector(0, 0, 50000),
                                                   XY - FVector(0, 0, 50000),
                                                   ECC_Visibility, Params) ||
            Hit.ImpactNormal.Z < MinNormalZ)
        {
            continue;
        }
        const float Size = HeightCm * Random.FRandRange(0.72f, 1.35f);
        const float Scale = Size / MeshHeight;
        const float Yaw = Random.FRandRange(0.0f, 360.0f);
        const FRotator Rotation(0, Yaw, 0);
        const FVector Offset = Rotation.RotateVector(FVector(CentreX, CentreY, 0) * Scale);
        const FVector Position = Hit.ImpactPoint - Offset -
            FVector(0, 0, (Box.Min.Z + MeshHeight * EmbedFraction) * Scale);
        Target->AddInstance(FTransform(Rotation, Position,
            FVector(Scale, Scale, Scale)), true);
        ++Added;
    }
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
    FRandomStream Random(20261015);
    const bool RocksOnly = FParse::Param(FCommandLine::Get(), TEXT("ashboundrocksonly"));
    const int32 RockCount = Scatter(Rocks, 45, 12500, 220, 0.20f, 0.55f, Random);
    const int32 FernCount = RocksOnly ? 0 : Scatter(Ferns, 500, 12000, 105, 0.05f, 0.72f, Random);
    const int32 GrassCount = RocksOnly ? 0 : Scatter(Grasses, 10000, 12500, 65, 0.03f, 0.76f, Random);
    const int32 StumpCount = RocksOnly ? 0 : Scatter(Stumps, 30, 11000, 190, 0.08f, 0.65f, Random);
    const int32 PineCount = RocksOnly ? 0 : Scatter(Pines, 230, 13500, 780, 0.03f, 0.69f, Random);
    UE_LOG(LogTemp, Display, TEXT("ASHBOUND_REBIRTH_GROUNDED rocks=%d ferns=%d grasses=%d stumps=%d pines=%d"),
        RockCount, FernCount, GrassCount, StumpCount, PineCount);
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
