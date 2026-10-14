#include "ASHBOUNDSpellManager.h"

#include "ASHBOUNDSpell.h"
#include "ASHBOUNDGrove.h"
#include "ASHBOUNDGrimoire.h"
#include "ASHBOUNDSeal.h"
#include "Components/InputComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/Engine.h"
#include "Engine/StaticMesh.h"
#include "Engine/StaticMeshActor.h"
#include "Engine/World.h"
#include "EngineUtils.h"
#include "GameFramework/PlayerController.h"
#include "InputCoreTypes.h"
#include "Kismet/GameplayStatics.h"
#include "Misc/CommandLine.h"
#include "Misc/Paths.h"
#include "Misc/Parse.h"
#include "UnrealClient.h"
#include "TimerManager.h"

AASHBOUNDSpellManager::AASHBOUNDSpellManager()
{
    PrimaryActorTick.bCanEverTick = true;
}

void AASHBOUNDSpellManager::BeginPlay()
{
    Super::BeginPlay();
    SetActorTickEnabled(false);
    APlayerController* Player = UGameplayStatics::GetPlayerController(this, 0);
    if (Player)
    {
        EnableInput(Player);
        if (InputComponent)
        {
            InputComponent->BindKey(EKeys::Q, IE_Pressed, this, &AASHBOUNDSpellManager::CastResonance);
            InputComponent->BindKey(EKeys::E, IE_Pressed, this, &AASHBOUNDSpellManager::CastEmber);
            InputComponent->BindKey(EKeys::R, IE_Pressed, this, &AASHBOUNDSpellManager::CastReweave);
            InputComponent->BindKey(EKeys::F, IE_Pressed, this, &AASHBOUNDSpellManager::StudyNearestBook);
            InputComponent->BindKey(EKeys::M, IE_Pressed, this, &AASHBOUNDSpellManager::ToggleMagnetism);
            InputComponent->BindKey(EKeys::Escape, IE_Pressed, this, &AASHBOUNDSpellManager::StopReading);
        }
    }
    if (GEngine)
    {
        GEngine->AddOnScreenDebugMessage(-1, 8.0f, FColor(152, 231, 218),
            TEXT("ASHBOUND | Q/E/R Zauber   F Buch lesen   M Metall anziehen/loslassen"));
    }

    for (TActorIterator<AStaticMeshActor> It(GetWorld()); It; ++It)
    {
        if (!It->ActorHasTag(TEXT("ASHBOUND_Magnetic"))) continue;
        UStaticMeshComponent* Mesh = It->GetStaticMeshComponent();
        if (!Mesh) continue;
        Mesh->SetMobility(EComponentMobility::Movable);
        Mesh->SetCollisionProfileName(TEXT("PhysicsActor"));
        Mesh->SetSimulatePhysics(true);
        Mesh->SetEnableGravity(true);
        Mesh->SetLinearDamping(0.6f);
    }

    const FVector Anchors[] = {
        FVector(900.0f, -450.0f, 255.0f),
        FVector(2600.0f, 410.0f, 255.0f),
        FVector(4200.0f, -420.0f, 255.0f)
    };
    for (int32 Index = 0; Index < 3; ++Index)
    {
        AASHBOUNDSpell* Wisp = GetWorld()->SpawnActor<AASHBOUNDSpell>(
            AASHBOUNDSpell::StaticClass(), Anchors[Index], FRotator::ZeroRotator);
        if (Wisp) Wisp->Initialize(Index, Anchors[Index], true);
    }
    UE_LOG(LogTemp, Display, TEXT("ASHBOUND living magic ready; three ambient wisps, Q/E/R/F/M input"));

#if !UE_BUILD_SHIPPING
    float OrbitAngle = 0.0f;
    if (FParse::Value(FCommandLine::Get(), TEXT("ashboundqaorbitangle="), OrbitAngle))
    {
        float OrbitHeight = 175.0f;
        FParse::Value(FCommandLine::Get(), TEXT("ashboundqaorbitheight="), OrbitHeight);
        if (!FMath::IsFinite(OrbitAngle) || OrbitAngle < 0.0f || OrbitAngle >= 360.0f ||
            !FMath::IsFinite(OrbitHeight) || OrbitHeight < 150.0f || OrbitHeight > 650.0f)
        {
            UE_LOG(LogTemp, Error, TEXT("ASHBOUND orbit QA invalid angle=%.1f height=%.1f"),
                   OrbitAngle, OrbitHeight);
        }
        else
        {
            FTimerHandle OrbitTimer;
            GetWorld()->GetTimerManager().SetTimer(OrbitTimer,
                FTimerDelegate::CreateWeakLambda(this, [this, OrbitAngle, OrbitHeight]()
            {
                APlayerController* Controller = UGameplayStatics::GetPlayerController(this, 0);
                if (!Controller || !Controller->GetPawn()) return;
                const FVector Focus(3000.0f, 0.0f, 165.0f);
                const float Radians = FMath::DegreesToRadians(OrbitAngle);
                const FVector Position = Focus + FVector(680.0f * FMath::Cos(Radians),
                                                         680.0f * FMath::Sin(Radians),
                                                         OrbitHeight - Focus.Z);
                Controller->GetPawn()->SetActorLocation(Position);
                // The first-person camera is above the pawn origin.
                Controller->SetControlRotation((Focus - Position - FVector(0, 0, 65)).Rotation());
                UE_LOG(LogTemp, Display, TEXT("ASHBOUND_ORBIT_QA angle=%.1f height=%.1f position=%s"),
                       OrbitAngle, OrbitHeight, *Position.ToString());
            }), 1.0f, false);
        }
    }
    if (FParse::Param(FCommandLine::Get(), TEXT("ashboundqagrove")))
    {
        FTimerHandle GroveViewTimer;
        GetWorld()->GetTimerManager().SetTimer(GroveViewTimer, FTimerDelegate::CreateWeakLambda(this, [this]()
        {
            APlayerController* Controller = UGameplayStatics::GetPlayerController(this, 0);
            if (!Controller || !Controller->GetPawn()) return;
            Controller->GetPawn()->SetActorLocation(FVector(3040, -400, 170));
            Controller->SetControlRotation(FRotator(-16, 52, 0));
            UStaticMesh* Fern = LoadObject<UStaticMesh>(nullptr,
                TEXT("/Game/ASHBOUND/Models/fern_02/fern_02_1k/StaticMeshes/fern_02_b.fern_02_b"));
            AASHBOUNDGrove* Grove = GetWorld()->SpawnActor<AASHBOUNDGrove>(
                AASHBOUNDGrove::StaticClass(), FVector(3348, 0, 47), FRotator::ZeroRotator);
            if (Grove) Grove->Initialize(Fern);
        }), 1.0f, false);
    }
    if (FParse::Param(FCommandLine::Get(), TEXT("ashboundqacollision")))
    {
        FTimerHandle CollisionTimer;
        GetWorld()->GetTimerManager().SetTimer(CollisionTimer,
            FTimerDelegate::CreateUObject(this, &AASHBOUNDSpellManager::VerifyTerrainCollision),
            1.0f, false);
    }
    if (FParse::Param(FCommandLine::Get(), TEXT("ashboundqaterrain")))
    {
        FTimerHandle TerrainTimer;
        GetWorld()->GetTimerManager().SetTimer(TerrainTimer, FTimerDelegate::CreateWeakLambda(this, [this]()
        {
            AActor* Terrain = nullptr;
            for (TActorIterator<AStaticMeshActor> It(GetWorld()); It; ++It)
            {
                const UStaticMeshComponent* Mesh = It->GetStaticMeshComponent();
                if (Mesh && Mesh->GetStaticMesh() &&
                    Mesh->GetStaticMesh()->GetPathName().Contains(TEXT("ASHBOUND_Valley")))
                {
                    Terrain = *It;
                    break;
                }
            }
            const FVector Points[] = {FVector(0, 5000, 4000), FVector(0, -5000, 4000),
                                      FVector(6000, 4000, 4000), FVector(6000, -4000, 4000)};
            for (const FVector& Start : Points)
            {
                FHitResult Hit;
                FCollisionQueryParams Query(SCENE_QUERY_STAT(ASHBOUNDTerrainQA), false);
                // Isolate the ground surface from decorative rocks and props.
                for (TActorIterator<AActor> It(GetWorld()); It; ++It)
                    if (*It != Terrain) Query.AddIgnoredActor(*It);
                const bool bHit = GetWorld()->LineTraceSingleByChannel(
                    Hit, Start, FVector(Start.X, Start.Y, -1000), ECC_Visibility, Query);
                if (!bHit || Hit.GetActor() != Terrain || Hit.ImpactPoint.Z < 200.0f)
                {
                    UE_LOG(LogTemp, Error, TEXT("ASHBOUND terrain QA failed x=%.0f y=%.0f actor=%s z=%.1f"),
                           Start.X, Start.Y, Hit.GetActor() ? *Hit.GetActor()->GetName() : TEXT("NONE"),
                           Hit.ImpactPoint.Z);
                }
                else
                {
                    UE_LOG(LogTemp, Display, TEXT("ASHBOUND terrain QA pass x=%.0f y=%.0f z=%.1f"),
                           Start.X, Start.Y, Hit.ImpactPoint.Z);
                }
            }
        }), 1.0f, false);
    }
    if (FParse::Param(FCommandLine::Get(), TEXT("ashboundqavault")) ||
        FParse::Param(FCommandLine::Get(), TEXT("ashboundqareadbook")) ||
        FParse::Param(FCommandLine::Get(), TEXT("ashboundqapage2")) ||
        FParse::Param(FCommandLine::Get(), TEXT("ashboundqagateview")))
    {
        const bool bPage2 = FParse::Param(FCommandLine::Get(), TEXT("ashboundqapage2"));
        const bool bRead = bPage2 || FParse::Param(FCommandLine::Get(), TEXT("ashboundqareadbook"));
        const bool bGate = FParse::Param(FCommandLine::Get(), TEXT("ashboundqagateview"));
        FTimerHandle VaultTimer;
        GetWorld()->GetTimerManager().SetTimer(VaultTimer, FTimerDelegate::CreateWeakLambda(this, [this, bRead, bGate, bPage2]()
        {
            APlayerController* Controller = UGameplayStatics::GetPlayerController(this, 0);
            if (!Controller || !Controller->GetPawn()) return;
            Controller->GetPawn()->SetActorLocation(bGate ? FVector(3440, 0, 160) :
                                                   (bRead ? FVector(2720, 0, 160) : FVector(1780, 0, 160)));
            Controller->SetControlRotation(FRotator(bRead ? -8.0f : 0.0f, 0, 0));
            if (bRead)
            {
                FTimerHandle ReadTimer;
                GetWorld()->GetTimerManager().SetTimer(ReadTimer,
                    FTimerDelegate::CreateUObject(this, &AASHBOUNDSpellManager::StudyNearestBook), 1.2f, false);
                if (bPage2)
                {
                    FTimerHandle TurnTimer;
                    GetWorld()->GetTimerManager().SetTimer(TurnTimer,
                        FTimerDelegate::CreateUObject(this, &AASHBOUNDSpellManager::StudyNearestBook), 2.0f, false);
                }
            }
        }), 1.0f, false);
    }
    if (FParse::Param(FCommandLine::Get(), TEXT("ashboundqacastall")))
    {
        FTimerHandle ResonanceTimer, EmberTimer, ReweaveTimer;
        GetWorld()->GetTimerManager().SetTimer(ResonanceTimer,
            FTimerDelegate::CreateUObject(this, &AASHBOUNDSpellManager::CastResonance), 1.0f, false);
        GetWorld()->GetTimerManager().SetTimer(EmberTimer,
            FTimerDelegate::CreateUObject(this, &AASHBOUNDSpellManager::CastEmber), 1.6f, false);
        GetWorld()->GetTimerManager().SetTimer(ReweaveTimer,
            FTimerDelegate::CreateUObject(this, &AASHBOUNDSpellManager::CastReweave), 2.2f, false);
    }
    else if (FParse::Param(FCommandLine::Get(), TEXT("ashboundqacast")))
    {
        FTimerHandle SpellTimer;
        GetWorld()->GetTimerManager().SetTimer(SpellTimer,
            FTimerDelegate::CreateUObject(this, &AASHBOUNDSpellManager::CastReweave), 1.6f, false);
    }
    const bool bMagnetVisual = FParse::Param(FCommandLine::Get(), TEXT("ashboundqamagnetvisual"));
    if (bMagnetVisual || FParse::Param(FCommandLine::Get(), TEXT("ashboundqamagnet")))
    {
        FTimerHandle MagnetTimer;
        GetWorld()->GetTimerManager().SetTimer(MagnetTimer,
            FTimerDelegate::CreateWeakLambda(this, [this, bMagnetVisual]()
        {
            APlayerController* Controller = UGameplayStatics::GetPlayerController(this, 0);
            if (!Controller || !Controller->GetPawn()) return;
            Controller->GetPawn()->SetActorLocation(FVector(2740, 327, 160));
            Controller->SetControlRotation(FRotator::ZeroRotator);
            AStaticMeshActor* Relic = nullptr;
            for (TActorIterator<AStaticMeshActor> It(GetWorld()); It; ++It)
                if (It->ActorHasTag(TEXT("ASHBOUND_Magnetic"))) { Relic = *It; break; }
            if (!Relic)
            {
                UE_LOG(LogTemp, Error, TEXT("ASHBOUND_MAGNET_QA missing relic"));
                return;
            }
            FTimerHandle PullTimer;
            GetWorld()->GetTimerManager().SetTimer(PullTimer,
                FTimerDelegate::CreateWeakLambda(this, [this, Relic, bMagnetVisual]()
            {
                const FVector Start = Relic->GetStaticMeshComponent()->GetComponentLocation();
                ToggleMagnetism();
                if (bMagnetVisual) return;
                FTimerHandle CheckTimer;
                GetWorld()->GetTimerManager().SetTimer(CheckTimer,
                    FTimerDelegate::CreateWeakLambda(this, [this, Relic, Start]()
                {
                    const FVector End = Relic->GetStaticMeshComponent()->GetComponentLocation();
                    const bool bAttracted = MagneticRelic.Get() == Relic &&
                        FVector::Dist(Start, End) > 35.0f && End.Z > Start.Z + 20.0f;
                    ToggleMagnetism();
                    const bool bReleased = !MagneticRelic.IsValid() &&
                        Relic->GetStaticMeshComponent()->IsGravityEnabled();
                    UE_LOG(LogTemp, Display,
                        TEXT("ASHBOUND_MAGNET_QA attracted=%d released=%d moved=%.1f lifted=%.1f pass=%d"),
                        bAttracted ? 1 : 0, bReleased ? 1 : 0,
                        FVector::Dist(Start, End), End.Z - Start.Z,
                        bAttracted && bReleased ? 1 : 0);
                    if (!bAttracted || !bReleased)
                        UE_LOG(LogTemp, Error, TEXT("ASHBOUND_MAGNET_QA FAIL"));
                    FTimerHandle DropTimer;
                    GetWorld()->GetTimerManager().SetTimer(DropTimer,
                        FTimerDelegate::CreateWeakLambda(this, [Relic, End]()
                    {
                        const float Drop = End.Z - Relic->GetStaticMeshComponent()->GetComponentLocation().Z;
                        UE_LOG(LogTemp, Display, TEXT("ASHBOUND_MAGNET_DROP descended=%.1f pass=%d"),
                            Drop, Drop > 20.0f ? 1 : 0);
                        if (Drop <= 20.0f)
                            UE_LOG(LogTemp, Error, TEXT("ASHBOUND_MAGNET_DROP FAIL"));
                    }), 1.2f, false);
                }), 2.0f, false);
            }), 0.3f, false);
        }), 1.0f, false);
    }
    if (FParse::Param(FCommandLine::Get(), TEXT("ashboundqapuzzle")))
    {
        FTimerHandle PuzzleTimer;
        GetWorld()->GetTimerManager().SetTimer(PuzzleTimer,
            FTimerDelegate::CreateWeakLambda(this, [this]()
        {
            for (TActorIterator<AASHBOUNDSeal> It(GetWorld()); It; ++It)
            {
                const FVector Target = It->GetActorLocation() + FVector(-90, 0, 0);
                AASHBOUNDSpell* Spell = GetWorld()->SpawnActor<AASHBOUNDSpell>(
                    AASHBOUNDSpell::StaticClass(), Target + FVector(-180, 0, 0), FRotator::ZeroRotator);
                if (Spell) Spell->Initialize(It->GetRequiredSchool(), Target, false);
            }
        }), 1.0f, false);
    }
    if (FParse::Param(FCommandLine::Get(), TEXT("ashboundqaimpact")))
    {
        FTimerHandle ImpactTimer;
        GetWorld()->GetTimerManager().SetTimer(ImpactTimer,
            FTimerDelegate::CreateWeakLambda(this, [this]()
        {
            const FVector Origin(3750, 0, 220);
            const FVector BehindGate(4200, 0, 220);
            AASHBOUNDSpell* Spell = GetWorld()->SpawnActor<AASHBOUNDSpell>(
                AASHBOUNDSpell::StaticClass(), Origin, FRotator::ZeroRotator);
            if (Spell) Spell->Initialize(0, BehindGate, false);
        }), 1.0f, false);
    }
    if (FParse::Param(FCommandLine::Get(), TEXT("ashboundqa")))
    {
        float CaptureDelay = 6.5f;
        FParse::Value(FCommandLine::Get(), TEXT("ashboundqadelay="), CaptureDelay);
        CaptureDelay = FMath::Clamp(CaptureDelay, 6.5f, 30.0f);
        FTimerHandle CaptureTimer;
        GetWorld()->GetTimerManager().SetTimer(CaptureTimer, FTimerDelegate::CreateLambda([]()
        {
            FScreenshotRequest::RequestScreenshot(
                FPaths::ProjectSavedDir() / TEXT("Screenshots/ASHBOUND-QA.png"), false, false);
        }), CaptureDelay, false);
    }
#endif
}

#if !UE_BUILD_SHIPPING
void AASHBOUNDSpellManager::VerifyTerrainCollision()
{
    UWorld* World = GetWorld();
    if (!World) return;

    struct FProbe
    {
        const TCHAR* Name;
        float Y;
        bool bExpectedHit;
        bool bExpectedTerrain;
    };
    const FProbe Probes[] = {
        { TEXT("central_road"), 0.0f, true, false },
        { TEXT("north_slope"), 7600.0f, true, true },
        { TEXT("south_slope"), -7600.0f, true, true },
        { TEXT("outside_valley"), 8500.0f, false, false }
    };
    bool bAllPassed = true;
    for (const FProbe& Probe : Probes)
    {
        FHitResult Hit;
        FCollisionQueryParams Query(SCENE_QUERY_STAT(ASHBOUNDQATerrain), false);
        Query.AddIgnoredActor(this);
        const bool bHit = World->LineTraceSingleByChannel(
            Hit, FVector(-3400.0f, Probe.Y, 6000.0f),
            FVector(-3400.0f, Probe.Y, -2000.0f), ECC_Visibility, Query);
        const UStaticMeshComponent* MeshComponent =
            bHit ? Cast<UStaticMeshComponent>(Hit.GetComponent()) : nullptr;
        const UStaticMesh* Mesh = MeshComponent ? MeshComponent->GetStaticMesh() : nullptr;
        const bool bTerrain = Mesh && Mesh->GetName() == TEXT("ASHBOUND_Valley");
        const bool bPassed = bHit == Probe.bExpectedHit &&
            (!Probe.bExpectedTerrain || bTerrain);
        bAllPassed &= bPassed;
        UE_LOG(LogTemp, Display,
            TEXT("ASHBOUND_COLLISION_SAMPLE name=%s hit=%d mesh=%s z=%.1f pass=%d"),
            Probe.Name, bHit ? 1 : 0, Mesh ? *Mesh->GetName() : TEXT("NONE"),
            bHit ? Hit.ImpactPoint.Z : 0.0f, bPassed ? 1 : 0);
    }
    // A visual trace alone does not establish that the pawn can contact the
    // imported slope. Sweep a player-sized capsule on the Pawn channel too.
    for (const float Y : { 7600.0f, -7600.0f })
    {
        FHitResult Hit;
        FCollisionQueryParams Query(SCENE_QUERY_STAT(ASHBOUNDQAPawn), false);
        Query.AddIgnoredActor(this);
        const bool bHit = World->SweepSingleByChannel(
            Hit, FVector(-3400.0f, Y, 6000.0f),
            FVector(-3400.0f, Y, -2000.0f), FQuat::Identity,
            ECC_Pawn, FCollisionShape::MakeCapsule(34.0f, 88.0f), Query);
        const UStaticMeshComponent* MeshComponent =
            bHit ? Cast<UStaticMeshComponent>(Hit.GetComponent()) : nullptr;
        const UStaticMesh* Mesh = MeshComponent ? MeshComponent->GetStaticMesh() : nullptr;
        const bool bPassed = Mesh && Mesh->GetName() == TEXT("ASHBOUND_Valley");
        bAllPassed &= bPassed;
        UE_LOG(LogTemp, Display,
            TEXT("ASHBOUND_PAWN_COLLISION_SAMPLE y=%.1f hit=%d mesh=%s z=%.1f pass=%d"),
            Y, bHit ? 1 : 0, Mesh ? *Mesh->GetName() : TEXT("NONE"),
            bHit ? Hit.ImpactPoint.Z : 0.0f, bPassed ? 1 : 0);
    }
    if (bAllPassed)
    {
        UE_LOG(LogTemp, Display, TEXT("ASHBOUND_COLLISION_QA PASS"));
    }
    else
    {
        UE_LOG(LogTemp, Error, TEXT("ASHBOUND_COLLISION_QA FAIL"));
    }
}
#endif

void AASHBOUNDSpellManager::CastResonance() { CastSchool(0); }
void AASHBOUNDSpellManager::CastEmber() { CastSchool(1); }
void AASHBOUNDSpellManager::CastReweave() { CastSchool(2); }

void AASHBOUNDSpellManager::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);
    AStaticMeshActor* Relic = MagneticRelic.Get();
    APlayerController* Player = UGameplayStatics::GetPlayerController(this, 0);
    if (!Relic || !Player)
    {
        SetActorTickEnabled(false);
        return;
    }
    UStaticMeshComponent* Mesh = Relic->GetStaticMeshComponent();
    if (!Mesh || !Mesh->IsSimulatingPhysics())
    {
        MagneticRelic.Reset();
        SetActorTickEnabled(false);
        return;
    }
    FVector Eye;
    FRotator Look;
    Player->GetPlayerViewPoint(Eye, Look);
    const FVector Target = Eye + Look.Vector() * 190.0f;
    const FVector Displacement = Target - Mesh->GetComponentLocation();
    const FVector Force = (Displacement * 850.0f - Mesh->GetPhysicsLinearVelocity() * 130.0f)
        .GetClampedToMaxSize(250000.0f);
    Mesh->AddForce(Force);
}

void AASHBOUNDSpellManager::ToggleMagnetism()
{
    if (AStaticMeshActor* Held = MagneticRelic.Get())
    {
        if (UStaticMeshComponent* Mesh = Held->GetStaticMeshComponent())
        {
            Mesh->SetEnableGravity(true);
            Mesh->SetLinearDamping(0.6f);
        }
        MagneticRelic.Reset();
        SetActorTickEnabled(false);
        UE_LOG(LogTemp, Display, TEXT("ASHBOUND_MAGNET released"));
        return;
    }
    APlayerController* Player = UGameplayStatics::GetPlayerController(this, 0);
    if (!Player || !GetWorld()) return;
    FVector Eye;
    FRotator Look;
    Player->GetPlayerViewPoint(Eye, Look);
    AStaticMeshActor* Selected = nullptr;
    float NearestDistance = 450.0f;
    for (TActorIterator<AStaticMeshActor> It(GetWorld()); It; ++It)
    {
        if (!It->ActorHasTag(TEXT("ASHBOUND_Magnetic"))) continue;
        UStaticMeshComponent* Mesh = It->GetStaticMeshComponent();
        if (!Mesh || !Mesh->IsSimulatingPhysics()) continue;
        const FVector Direction = Mesh->GetComponentLocation() - Eye;
        const float Distance = Direction.Size();
        if (Distance < NearestDistance &&
            FVector::DotProduct(Direction.GetSafeNormal(), Look.Vector()) > 0.50f)
        {
            Selected = *It;
            NearestDistance = Distance;
        }
    }
    if (!Selected)
    {
        if (GEngine) GEngine->AddOnScreenDebugMessage(-1, 2.0f, FColor::White,
            TEXT("Kein magnetisierbares Metall im Blickfeld."));
        UE_LOG(LogTemp, Display, TEXT("ASHBOUND_MAGNET no eligible metal"));
        return;
    }
    UStaticMeshComponent* Mesh = Selected->GetStaticMeshComponent();
    Mesh->SetEnableGravity(false);
    Mesh->SetLinearDamping(2.0f);
    MagneticRelic = Selected;
    SetActorTickEnabled(true);
    UE_LOG(LogTemp, Display, TEXT("ASHBOUND_MAGNET attracted %s"), *Selected->GetName());
}

void AASHBOUNDSpellManager::StudyNearestBook()
{
    APlayerController* Player = UGameplayStatics::GetPlayerController(this, 0);
    if (!Player || !GetWorld()) return;
    FVector Eye;
    FRotator Look;
    Player->GetPlayerViewPoint(Eye, Look);
    AASHBOUNDGrimoire* Nearest = nullptr;
    float NearestDistance = 300.0f;
    for (TActorIterator<AASHBOUNDGrimoire> It(GetWorld()); It; ++It)
    {
        const FVector Direction = It->GetActorLocation() - Eye;
        const float Distance = Direction.Size();
        if (Distance < NearestDistance &&
            FVector::DotProduct(Direction.GetSafeNormal(), Look.Vector()) > 0.50f)
        {
            Nearest = *It;
            NearestDistance = Distance;
        }
    }
    if (Nearest) Nearest->Study();
    else if (GEngine) GEngine->AddOnScreenDebugMessage(-1, 2.0f, FColor::White,
        TEXT("Nähere dich dem Buch und sieh es an."));
}

void AASHBOUNDSpellManager::StopReading()
{
    if (!GetWorld()) return;
    for (TActorIterator<AASHBOUNDGrimoire> It(GetWorld()); It; ++It)
    {
        if (It->IsOpen()) It->StopReading();
    }
}

void AASHBOUNDSpellManager::CastSchool(int32 School)
{
    APlayerController* Player = UGameplayStatics::GetPlayerController(this, 0);
    if (!Player || !GetWorld()) return;

    FVector Eye;
    FRotator Look;
    Player->GetPlayerViewPoint(Eye, Look);
    const FVector Forward = Look.Vector();
    UE_LOG(LogTemp, Display, TEXT("ASHBOUND aim eye=%s forward=%s pawn=%s"),
           *Eye.ToString(), *Forward.ToString(),
           Player->GetPawn() ? *Player->GetPawn()->GetName() : TEXT("NONE"));
    FVector Target = Eye + Forward * 1900.0f;
    FHitResult Hit;
    FCollisionQueryParams Query(SCENE_QUERY_STAT(ASHBOUNDSpellAim), false);
    if (Player->GetPawn()) Query.AddIgnoredActor(Player->GetPawn());
    if (GetWorld()->LineTraceSingleByChannel(Hit, Eye, Target, ECC_Visibility, Query))
    {
        UE_LOG(LogTemp, Display, TEXT("ASHBOUND aim hit=%s distance=%.1f"),
               Hit.GetActor() ? *Hit.GetActor()->GetName() : TEXT("NONE"), Hit.Distance);
        Target = Hit.ImpactPoint + Hit.ImpactNormal * 85.0f;
    }
    FActorSpawnParameters Spawn;
    Spawn.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;
    AASHBOUNDSpell* Spell = GetWorld()->SpawnActor<AASHBOUNDSpell>(
        AASHBOUNDSpell::StaticClass(), Eye + Forward * 180.0f,
        FRotator::ZeroRotator, Spawn);
    if (Spell) Spell->Initialize(School, Target, false);
    UE_LOG(LogTemp, Display, TEXT("ASHBOUND spell cast school=%d target=%s"),
           School, *Target.ToString());
}
