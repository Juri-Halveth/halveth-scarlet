#include "ASHBOUNDSpellManager.h"

#include "ASHBOUNDSpell.h"
#include "ASHBOUNDGrimoire.h"
#include "ASHBOUNDSeal.h"
#include "Components/InputComponent.h"
#include "Engine/Engine.h"
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
            InputComponent->BindKey(EKeys::F, IE_Pressed, this, &AASHBOUNDSpellManager::StudyNearestBook);
            InputComponent->BindKey(EKeys::Escape, IE_Pressed, this, &AASHBOUNDSpellManager::StopReading);
        }
    }
    if (GEngine)
    {
        GEngine->AddOnScreenDebugMessage(-1, 8.0f, FColor(152, 231, 218),
            TEXT("ASHBOUND | Q Resonanz   E Glut   R Neufassung   F Buch lesen"));
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
    UE_LOG(LogTemp, Display, TEXT("ASHBOUND living magic ready; three ambient wisps, Q/E/R/F input"));

#if !UE_BUILD_SHIPPING
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

void AASHBOUNDSpellManager::CastResonance() { CastSchool(0); }
void AASHBOUNDSpellManager::CastEmber() { CastSchool(1); }
void AASHBOUNDSpellManager::CastReweave() { CastSchool(2); }

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
