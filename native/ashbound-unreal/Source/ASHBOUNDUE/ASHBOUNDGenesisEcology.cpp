#include "ASHBOUNDGenesisEcology.h"

#include "ASHBOUNDRebirthPopulation.h"
#include "Components/HierarchicalInstancedStaticMeshComponent.h"
#include "CoreGlobals.h"
#include "Engine/DirectionalLight.h"
#include "Engine/World.h"
#include "EngineUtils.h"
#include "GameFramework/Pawn.h"
#include "GameFramework/PlayerController.h"
#include "HAL/FileManager.h"
#include "Kismet/GameplayStatics.h"
#include "Misc/CommandLine.h"
#include "Misc/Parse.h"
#include "Misc/Paths.h"
#include "LandscapeProxy.h"
#include "TimerManager.h"
#include "UnrealClient.h"

AASHBOUNDGenesisEcology::AASHBOUNDGenesisEcology()
{
    PrimaryActorTick.bCanEverTick = false;
}

void AASHBOUNDGenesisEcology::BeginPlay()
{
    Super::BeginPlay();
    FParse::Value(FCommandLine::Get(), TEXT("ashboundyear="), Year);
    FParse::Value(FCommandLine::Get(), TEXT("ashboundday="), DayOfYear);
    FParse::Value(FCommandLine::Get(), TEXT("ashboundhour="), Hour);
    Year = FMath::Max(Year, 1);
    DayOfYear = FMath::Clamp(DayOfYear, 1, 365);
    Hour = FMath::Clamp(Hour, 0.0f, 23.99f);
    LastClockTime = GetWorld()->GetTimeSeconds();
    UE_LOG(LogTemp, Display,
        TEXT("ASHBOUND_GENESIS_ENVIRONMENT year=%d day=%d hour=%.2f latitude=50 climate=regional_soil"),
        Year, DayOfYear, Hour);
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
            FScreenshotRequest::RequestScreenshot(File, true, false);
            UE_LOG(LogTemp, Display, TEXT("ASHBOUND_GENESIS_SCREENSHOT_REQUEST %s"), *File);
        }), ScreenshotDelay, false);
    }

    // Isolated movement witness. It advances the possessed pawn over terrain
    // in small steps to exercise cell streaming; it does not emulate WASD or
    // establish normal player movement quality.
    if (FParse::Param(FCommandLine::Get(), TEXT("ashboundtraverse")))
    {
        float EndX = 0.0f, EndY = 0.0f, Duration = 30.0f;
        const bool HasX = FParse::Value(FCommandLine::Get(), TEXT("ashboundtraversex="), EndX);
        const bool HasY = FParse::Value(FCommandLine::Get(), TEXT("ashboundtraversey="), EndY);
        FParse::Value(FCommandLine::Get(), TEXT("ashboundtraverseduration="), Duration);
        Duration = FMath::Clamp(Duration, 5.0f, 120.0f);
        if (!HasX || !HasY ||
            !FMath::IsFinite(EndX) || !FMath::IsFinite(EndY) ||
            FMath::Abs(EndX) > 240000.0f || FMath::Abs(EndY) > 240000.0f)
        {
            UE_LOG(LogTemp, Error, TEXT("ASHBOUND_GENESIS_TRAVERSE invalid destination"));
        }
        else
        {
            FTimerHandle StartTimer;
            GetWorldTimerManager().SetTimer(StartTimer,
                FTimerDelegate::CreateLambda([this, EndX, EndY, Duration]()
            {
                APlayerController* Controller = GetWorld()->GetFirstPlayerController();
                APawn* Pawn = Controller ? Controller->GetPawn() : nullptr;
                if (!Pawn)
                {
                    UE_LOG(LogTemp, Error, TEXT("ASHBOUND_GENESIS_TRAVERSE missing pawn"));
                    return;
                }
                const TWeakObjectPtr<APawn> PawnWeak(Pawn);
                const FVector Start = Pawn->GetActorLocation();
                const float StartedAt = GetWorld()->GetTimeSeconds();
                UE_LOG(LogTemp, Display,
                    TEXT("ASHBOUND_GENESIS_TRAVERSE_START x=%.0f y=%.0f target_x=%.0f target_y=%.0f duration=%.1f"),
                    Start.X, Start.Y, EndX, EndY, Duration);
                GetWorldTimerManager().SetTimer(TraversalTimer,
                    FTimerDelegate::CreateLambda([this, PawnWeak, Start, EndX, EndY, Duration, StartedAt,
                                                  Steps = 0]() mutable
                {
                    APawn* MovingPawn = PawnWeak.Get();
                    if (!MovingPawn)
                    {
                        UE_LOG(LogTemp, Error, TEXT("ASHBOUND_GENESIS_TRAVERSE pawn lost"));
                        GetWorldTimerManager().ClearTimer(TraversalTimer);
                        return;
                    }
                    const float Alpha = FMath::Clamp(
                        (GetWorld()->GetTimeSeconds() - StartedAt) / Duration, 0.0f, 1.0f);
                    const FVector XY(FMath::Lerp(Start.X, EndX, Alpha),
                                     FMath::Lerp(Start.Y, EndY, Alpha), 0.0f);
                    FCollisionQueryParams Query(SCENE_QUERY_STAT(ASHBOUNDGenesisTraversal), false, this);
                    Query.AddIgnoredActor(MovingPawn);
                    FHitResult Ground;
                    if (!GetWorld()->LineTraceSingleByChannel(Ground,
                        XY + FVector(0, 0, 50000), XY - FVector(0, 0, 50000),
                        ECC_Visibility, Query))
                    {
                        UE_LOG(LogTemp, Error,
                            TEXT("ASHBOUND_GENESIS_TRAVERSE ground missing x=%.0f y=%.0f"), XY.X, XY.Y);
                        GetWorldTimerManager().ClearTimer(TraversalTimer);
                        return;
                    }
                    if (!MovingPawn->SetActorLocation(Ground.ImpactPoint + FVector(0, 0, 200),
                        false, nullptr, ETeleportType::TeleportPhysics))
                    {
                        UE_LOG(LogTemp, Error,
                            TEXT("ASHBOUND_GENESIS_TRAVERSE pawn move failed x=%.0f y=%.0f"),
                            XY.X, XY.Y);
                        GetWorldTimerManager().ClearTimer(TraversalTimer);
                        return;
                    }
                    ++Steps;
                    if (Steps % 20 == 0 || Alpha >= 1.0f)
                        UE_LOG(LogTemp, Display,
                            TEXT("ASHBOUND_GENESIS_TRAVERSE_PROGRESS alpha=%.3f x=%.0f y=%.0f steps=%d detail=%d near=%d macro=%d"),
                            Alpha, XY.X, XY.Y, Steps,
                            DetailCells.Num(), NearCells.Num(), MacroCells.Num());
                    if (Alpha >= 1.0f)
                    {
                        UE_LOG(LogTemp, Display,
                            TEXT("ASHBOUND_GENESIS_TRAVERSE_DONE x=%.0f y=%.0f steps=%d"),
                            XY.X, XY.Y, Steps);
                        GetWorldTimerManager().ClearTimer(TraversalTimer);
                    }
                }), 0.25f, true);
            }), 2.0f, false);
        }
    }
}

void AASHBOUNDGenesisEcology::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
    GetWorldTimerManager().ClearTimer(RefreshTimer);
    GetWorldTimerManager().ClearTimer(TraversalTimer);
    NearCells.Empty();
    MacroCells.Empty();
    DetailCells.Empty();
    Super::EndPlay(EndPlayReason);
}

void AASHBOUNDGenesisEcology::RefreshCells()
{
    UWorld* World = GetWorld();
    if (!World) return;
    const float ClockNow = World->GetTimeSeconds();
    const float Elapsed = FMath::Clamp(ClockNow - LastClockTime, 0.0f, 1.0f);
    LastClockTime = ClockNow;
    // One game hour per real minute; the complete clock spans 24 real minutes.
    Hour += Elapsed / 60.0f;
    if (Hour >= 24.0f)
    {
        Hour -= 24.0f;
        DayOfYear = DayOfYear % 365 + 1;
        if (DayOfYear == 1) ++Year;
    }
    if (ClockNow - LastSunUpdate >= 5.0f)
    {
        LastSunUpdate = ClockNow;
        for (TActorIterator<ADirectionalLight> It(World); It; ++It)
        {
            const FVector TowardSun = FASHBOUNDSoil::SunVector(DayOfYear, Hour);
            It->SetActorRotation((-TowardSun).Rotation());
            UE_LOG(LogTemp, Display,
                TEXT("ASHBOUND_GENESIS_SUN day=%d hour=%.2f elevation=%.3f"),
                DayOfYear, Hour, TowardSun.Z);
            break;
        }
    }
    APlayerController* Controller = World ? World->GetFirstPlayerController() : nullptr;
    APawn* Pawn = Controller ? Controller->GetPawn() : nullptr;
    if (!Pawn) return;
    const FVector Position = Pawn->GetActorLocation();
    if (ClockNow - LastSoilSample >= 1.0f)
    {
        LastSoilSample = ClockNow;
        const bool InitialSample = !bGroundProfileValid;
        for (TActorIterator<ALandscapeProxy> It(World); It; ++It)
        {
            const TOptional<float> Height = It->GetHeightAtLocation(Position);
            const FVector East = Position + FVector(500, 0, 0);
            const FVector West = Position - FVector(500, 0, 0);
            const FVector North = Position + FVector(0, 500, 0);
            const FVector South = Position - FVector(0, 500, 0);
            const TOptional<float> HE = It->GetHeightAtLocation(East);
            const TOptional<float> HW = It->GetHeightAtLocation(West);
            const TOptional<float> HN = It->GetHeightAtLocation(North);
            const TOptional<float> HS = It->GetHeightAtLocation(South);
            bGroundProfileValid = Height.IsSet() && HE.IsSet() && HW.IsSet() &&
                HN.IsSet() && HS.IsSet();
            if (bGroundProfileValid)
            {
                const FVector Normal((HW.GetValue() - HE.GetValue()) / 1000.0f,
                    (HS.GetValue() - HN.GetValue()) / 1000.0f, 1.0f);
                GroundProfile = FASHBOUNDSoil::Sample(
                    FVector(Position.X, Position.Y, Height.GetValue()),
                    Normal, DayOfYear);
                if (InitialSample)
                {
                    UE_LOG(LogTemp, Display,
                        TEXT("ASHBOUND_GENESIS_SOIL organic_cm=%.1f mineral_cm=%.1f bedrock_cm=%.1f moisture=%.3f solar=%.3f roots=%.3f"),
                        GroundProfile.OrganicCm, GroundProfile.MineralCm,
                        GroundProfile.BedrockDepthCm, GroundProfile.Moisture,
                        GroundProfile.SolarExposure, GroundProfile.RootCapacity);
                    if (FParse::Param(FCommandLine::Get(), TEXT("ashboundsoilprobe")))
                        for (const float DepthCm : {5.0f, 45.0f, 125.0f, 250.0f})
                        {
                            const FASHBOUNDSoilVolumeSample V = FASHBOUNDSoil::SampleVolume(
                                FVector(Position.X, Position.Y, Height.GetValue() - DepthCm),
                                Height.GetValue(), Normal, DayOfYear);
                            UE_LOG(LogTemp, Display,
                                TEXT("ASHBOUND_SOIL_VOLUME x=%.0f y=%.0f depth=%.0f matter=%d organic_bottom=%.1f rock_top=%.1f moisture=%.3f porosity=%.3f"),
                                Position.X, Position.Y, V.DepthCm, static_cast<int32>(V.Matter),
                                V.OrganicBottomCm, V.RockTopCm, V.Moisture, V.Porosity);
                        }
                }
            }
            break;
        }
    }

    using FCellMap = TMap<FIntPoint, TWeakObjectPtr<AASHBOUNDRebirthPopulation>>;
    auto UpdateSet = [&](FCellMap& Cells, const FIntPoint& Center, int32 Width,
                         int32 LoadRadius, int32 KeepRadius, int32 Budget,
                         bool bMacro, bool bDetail = false)
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
            for (const FCellMap* Existing : {&DetailCells, &NearCells, &MacroCells})
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
                Population->ConfigureGenesisCell(bMacro, bDetail);
                UGameplayStatics::FinishSpawningActor(Population, Transform);
                Cells.Add(Cell, Population);
                ++Spawned;
            }
        }
        if (Spawned || DeferredForTerrain)
            UE_LOG(LogTemp, Display,
                TEXT("ASHBOUND_GENESIS_ECOLOGY tier=%s center=%d,%d active=%d pending=%d spawned=%d terrain_deferred=%d"),
                bDetail ? TEXT("DETAIL") : bMacro ? TEXT("MACRO") : TEXT("NEAR"),
                Center.X, Center.Y,
                Cells.Num(), Missing.Num() - Spawned, Spawned, DeferredForTerrain);
    };

    const FIntPoint MacroCenter(FMath::FloorToInt(Position.X / MacroCellWidthCm),
                                FMath::FloorToInt(Position.Y / MacroCellWidthCm));
    const FIntPoint NearCenter(FMath::FloorToInt(Position.X / NearCellWidthCm),
                               FMath::FloorToInt(Position.Y / NearCellWidthCm));
    const FIntPoint DetailCenter(FMath::FloorToInt(Position.X / DetailCellWidthCm),
                                 FMath::FloorToInt(Position.Y / DetailCellWidthCm));
    UpdateSet(MacroCells, MacroCenter, MacroCellWidthCm, 1, 2, 2, true);
    // The broad material carries vegetation colour beyond the 90 m instance
    // cull. Streaming 25 plant cells there consumed draw/setup work without
    // adding visible blades in the entry vista.
    UpdateSet(NearCells, NearCenter, NearCellWidthCm, 1, 1, 3, false);
    UpdateSet(DetailCells, DetailCenter, DetailCellWidthCm, 1, 1, 4, false, true);

    const double Now = FPlatformTime::Seconds();
    if (LastMetricsAt <= 0.0)
    {
        LastMetricsAt = Now;
        LastMetricsFrame = GFrameCounter;
    }
    else if (Now - LastMetricsAt >= 5.0)
    {
        int64 Instances = 0;
        for (const FCellMap* Cells : {&DetailCells, &NearCells, &MacroCells})
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
            TEXT("ASHBOUND_GENESIS_RUNTIME detail=%d near=%d macro=%d instances=%lld frames_per_second=%.1f sample_seconds=%.1f"),
            DetailCells.Num(), NearCells.Num(), MacroCells.Num(), Instances,
            FramesPerSecond, Now - LastMetricsAt);
        LastMetricsAt = Now;
        LastMetricsFrame = GFrameCounter;
    }
}
