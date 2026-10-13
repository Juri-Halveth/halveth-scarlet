#include "ASHBOUNDSpellManager.h"

#include "ASHBOUNDSpell.h"
#include "Components/InputComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/Engine.h"
#include "Engine/StaticMesh.h"
#include "Engine/StaticMeshActor.h"
#include "Engine/World.h"
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
    PrimaryActorTick.bCanEverTick = false;
}

void AASHBOUNDSpellManager::BeginPlay()
{
    Super::BeginPlay();
    APlayerController* Player = UGameplayStatics::GetPlayerController(this, 0);
    if (Player)
    {
        EnableInput(Player);
        if (InputComponent)
        {
            InputComponent->BindKey(EKeys::Q, IE_Pressed, this, &AASHBOUNDSpellManager::CastResonance);
            InputComponent->BindKey(EKeys::E, IE_Pressed, this, &AASHBOUNDSpellManager::CastEmber);
            InputComponent->BindKey(EKeys::R, IE_Pressed, this, &AASHBOUNDSpellManager::CastReweave);
        }
    }
    if (GEngine)
    {
        GEngine->AddOnScreenDebugMessage(-1, 8.0f, FColor(152, 231, 218),
            TEXT("ASHBOUND | Q Resonanz   E Glut   R Neufassung"));
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
    UE_LOG(LogTemp, Display, TEXT("ASHBOUND living magic ready; three ambient wisps, Q/E/R input"));

#if !UE_BUILD_SHIPPING
    if (FParse::Param(FCommandLine::Get(), TEXT("ashboundqacollision")))
    {
        FTimerHandle CollisionTimer;
        GetWorld()->GetTimerManager().SetTimer(CollisionTimer,
            FTimerDelegate::CreateUObject(this, &AASHBOUNDSpellManager::VerifyTerrainCollision),
            1.0f, false);
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
    if (FParse::Param(FCommandLine::Get(), TEXT("ashboundqa")))
    {
        FTimerHandle CaptureTimer;
        GetWorld()->GetTimerManager().SetTimer(CaptureTimer, FTimerDelegate::CreateLambda([]()
        {
            FScreenshotRequest::RequestScreenshot(
                FPaths::ProjectSavedDir() / TEXT("Screenshots/ASHBOUND-QA.png"), false, false);
        }), 6.5f, false);
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
