#include "ASHBOUNDGenesisEcology.h"

#include "ASHBOUNDRebirthPopulation.h"
#include "Components/HierarchicalInstancedStaticMeshComponent.h"
#include "CoreGlobals.h"
#include "Engine/World.h"
#include "GameFramework/Pawn.h"
#include "GameFramework/PlayerController.h"
#include "HAL/FileManager.h"
#include "Kismet/GameplayStatics.h"
#include "Misc/CommandLine.h"
#include "Misc/Parse.h"
#include "Misc/Paths.h"
#include "TimerManager.h"
#include "UnrealClient.h"

AASHBOUNDGenesisEcology::AASHBOUNDGenesisEcology()
{
    PrimaryActorTick.bCanEverTick = false;
}

void AASHBOUNDGenesisEcology::BeginPlay()
{
    Super::BeginPlay();
    RefreshCells();
    GetWorldTimerManager().SetTimer(RefreshTimer, this,
        &AASHBOUNDGenesisEcology::RefreshCells, 0.25f, true);

    // Isolated visual QA: the release path has no teleport or screenshot timer.
    if (FParse::Param(FCommandLine::Get(), TEXT("ashboundshot")))
    {
        float ShotX = 0.0f;
        float ShotY = 0.0f;
        const bool HasX = FParse::Value(FCommandLine::Get(), TEXT("ashboundshotx="), ShotX);
        const bool HasY = FParse::Value(FCommandLine::Get(), TEXT("ashboundshoty="), ShotY);
        if (HasX != HasY)
        {
            UE_LOG(LogTemp, Error, TEXT("ASHBOUND_GENESIS_QA needs both shotx and shoty"));
        }
        else if (HasX)
        {
            FTimerHandle MoveTimer;
            GetWorldTimerManager().SetTimer(MoveTimer, FTimerDelegate::CreateLambda([this, ShotX, ShotY]()
            {
                FHitResult Ground;
                FCollisionQueryParams Query(SCENE_QUERY_STAT(ASHBOUNDGenesisRemoteProbe), false, this);
                const bool Found = GetWorld()->LineTraceSingleByChannel(Ground,
                    FVector(ShotX, ShotY, 50000), FVector(ShotX, ShotY, -50000),
                    ECC_Visibility, Query);
                APlayerController* Controller = GetWorld()->GetFirstPlayerController();
                APawn* Pawn = Controller ? Controller->GetPawn() : nullptr;
                const bool Moved = Found && Pawn && Pawn->SetActorLocation(
                    Ground.ImpactPoint + FVector(0, 0, 200), false, nullptr,
                    ETeleportType::TeleportPhysics);
                UE_LOG(LogTemp, Display,
                    TEXT("ASHBOUND_GENESIS_REMOTE_GROUND x=%f y=%f hit=%d moved=%d z=%f"),
                    ShotX, ShotY, Found ? 1 : 0, Moved ? 1 : 0,
                    Found ? Ground.ImpactPoint.Z : 0.0f);
            }), 2.0f, false);
        }
        float ScreenshotDelay = 25.0f;
        FParse::Value(FCommandLine::Get(), TEXT("ashboundshotdelay="), ScreenshotDelay);
        ScreenshotDelay = FMath::Clamp(ScreenshotDelay, 3.0f, 120.0f);
        FTimerHandle ScreenshotTimer;
        GetWorldTimerManager().SetTimer(ScreenshotTimer, FTimerDelegate::CreateLambda([this]()
        {
            const FString File = FPaths::ProjectSavedDir() / TEXT("Screenshots/Genesis.png");
            IFileManager::Get().MakeDirectory(*FPaths::GetPath(File), true);
            FScreenshotRequest::RequestScreenshot(File, false, false);
            UE_LOG(LogTemp, Display, TEXT("ASHBOUND_GENESIS_SCREENSHOT_REQUEST %s"), *File);
        }), ScreenshotDelay, false);
    }
}

void AASHBOUNDGenesisEcology::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
    GetWorldTimerManager().ClearTimer(RefreshTimer);
    NearCells.Empty();
    MacroCells.Empty();
    Super::EndPlay(EndPlayReason);
}

void AASHBOUNDGenesisEcology::RefreshCells()
{
    UWorld* World = GetWorld();
    APlayerController* Controller = World ? World->GetFirstPlayerController() : nullptr;
    APawn* Pawn = Controller ? Controller->GetPawn() : nullptr;
    if (!Pawn) return;
    const FVector Position = Pawn->GetActorLocation();

    using FCellMap = TMap<FIntPoint, TWeakObjectPtr<AASHBOUNDRebirthPopulation>>;
    auto UpdateSet = [&](FCellMap& Cells, const FIntPoint& Center, int32 Width,
                         int32 LoadRadius, int32 KeepRadius, int32 Budget, bool bMacro)
    {
        for (auto It = Cells.CreateIterator(); It; ++It)
        {
            const FIntPoint Cell = It.Key();
            if (!It.Value().IsValid() ||
                FMath::Abs(Cell.X - Center.X) > KeepRadius ||
                FMath::Abs(Cell.Y - Center.Y) > KeepRadius)
            {
                if (AASHBOUNDRebirthPopulation* Population = It.Value().Get())
                    Population->Destroy();
                It.RemoveCurrent();
            }
        }

        TArray<FIntPoint> Missing;
        for (int32 Y = -LoadRadius; Y <= LoadRadius; ++Y)
            for (int32 X = -LoadRadius; X <= LoadRadius; ++X)
            {
                const FIntPoint Cell(Center.X + X, Center.Y + Y);
                const int64 MinX = static_cast<int64>(Cell.X) * Width;
                const int64 MinY = static_cast<int64>(Cell.Y) * Width;
                // Keep the whole cell inside the 5.04 km authored terrain.
                if (MinX < -252000 || MinY < -252000 ||
                    MinX + Width > 252000 || MinY + Width > 252000)
                    continue;
                if (!Cells.Contains(Cell)) Missing.Add(Cell);
            }
        Missing.Sort([Center](const FIntPoint& A, const FIntPoint& B)
        {
            const int32 DA = FMath::Square(A.X - Center.X) + FMath::Square(A.Y - Center.Y);
            const int32 DB = FMath::Square(B.X - Center.X) + FMath::Square(B.Y - Center.Y);
            return DA == DB ? (A.Y == B.Y ? A.X < B.X : A.Y < B.Y) : DA < DB;
        });

        int32 Spawned = 0;
        int32 DeferredForTerrain = 0;
        for (const FIntPoint& Cell : Missing)
        {
            if (Spawned >= Budget) break;
            const FVector Origin((Cell.X + 0.5f) * Width, (Cell.Y + 0.5f) * Width, 0.0f);
            FCollisionQueryParams Query(SCENE_QUERY_STAT(ASHBOUNDGenesisCellGround), false, this);
            Query.AddIgnoredActor(Pawn);
            for (const FCellMap* Existing : {&NearCells, &MacroCells})
                for (const auto& Pair : *Existing)
                    if (AASHBOUNDRebirthPopulation* Population = Pair.Value.Get())
                        Query.AddIgnoredActor(Population);
            FHitResult Ground;
            if (!World->LineTraceSingleByChannel(Ground, Origin + FVector(0, 0, 50000),
                Origin - FVector(0, 0, 50000), ECC_Visibility, Query))
            {
                ++DeferredForTerrain;
                continue;
            }

            const FTransform Transform(FRotator::ZeroRotator, Origin);
            AASHBOUNDRebirthPopulation* Population =
                World->SpawnActorDeferred<AASHBOUNDRebirthPopulation>(
                    AASHBOUNDRebirthPopulation::StaticClass(), Transform, this, nullptr,
                    ESpawnActorCollisionHandlingMethod::AlwaysSpawn);
            if (Population)
            {
                Population->ConfigureGenesisCell(bMacro);
                UGameplayStatics::FinishSpawningActor(Population, Transform);
                Cells.Add(Cell, Population);
                ++Spawned;
            }
        }
        if (Spawned || DeferredForTerrain)
            UE_LOG(LogTemp, Display,
                TEXT("ASHBOUND_GENESIS_ECOLOGY tier=%s center=%d,%d active=%d pending=%d spawned=%d terrain_deferred=%d"),
                bMacro ? TEXT("MACRO") : TEXT("NEAR"), Center.X, Center.Y,
                Cells.Num(), Missing.Num() - Spawned, Spawned, DeferredForTerrain);
    };

    const FIntPoint MacroCenter(FMath::FloorToInt(Position.X / MacroCellWidthCm),
                                FMath::FloorToInt(Position.Y / MacroCellWidthCm));
    const FIntPoint NearCenter(FMath::FloorToInt(Position.X / NearCellWidthCm),
                               FMath::FloorToInt(Position.Y / NearCellWidthCm));
    UpdateSet(MacroCells, MacroCenter, MacroCellWidthCm, 1, 2, 2, true);
    UpdateSet(NearCells, NearCenter, NearCellWidthCm, 2, 3, 3, false);

    const double Now = FPlatformTime::Seconds();
    if (LastMetricsAt <= 0.0)
    {
        LastMetricsAt = Now;
        LastMetricsFrame = GFrameCounter;
    }
    else if (Now - LastMetricsAt >= 5.0)
    {
        int64 Instances = 0;
        for (const FCellMap* Cells : {&NearCells, &MacroCells})
            for (const auto& Pair : *Cells)
                if (AASHBOUNDRebirthPopulation* Population = Pair.Value.Get())
                {
                    TArray<UHierarchicalInstancedStaticMeshComponent*> Components;
                    Population->GetComponents(Components);
                    for (const UHierarchicalInstancedStaticMeshComponent* Component : Components)
                        Instances += Component->GetInstanceCount();
                }
        const double FramesPerSecond =
            (GFrameCounter - LastMetricsFrame) / (Now - LastMetricsAt);
        UE_LOG(LogTemp, Display,
            TEXT("ASHBOUND_GENESIS_RUNTIME near=%d macro=%d instances=%lld frames_per_second=%.1f sample_seconds=%.1f"),
            NearCells.Num(), MacroCells.Num(), Instances, FramesPerSecond, Now - LastMetricsAt);
        LastMetricsAt = Now;
        LastMetricsFrame = GFrameCounter;
    }
}
