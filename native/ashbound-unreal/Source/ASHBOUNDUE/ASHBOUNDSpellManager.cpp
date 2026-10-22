#include "ASHBOUNDSpellManager.h"

#include "ASHBOUNDSpell.h"
#include "ASHBOUNDGrove.h"
#include "ASHBOUNDGrimoire.h"
#include "ASHBOUNDGenesis.h"
#include "ASHBOUNDSeal.h"
#include "ASHBOUNDStoryMemory.h"
#include "ASHBOUNDWitness.h"
#include "ASHBOUNDDreamer.h"
#include "ASHBOUNDArchiveGate.h"
#include "ASHBOUNDFungalHome.h"
#include "ASHBOUNDExpanse.h"
#include "Components/InputComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/Engine.h"
#include "Engine/StaticMesh.h"
#include "Engine/StaticMeshActor.h"
#include "Engine/World.h"
#include "EngineUtils.h"
#include "HttpModule.h"
#include "Interfaces/IHttpRequest.h"
#include "Interfaces/IHttpResponse.h"
#include "Dom/JsonObject.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"
#include "Serialization/JsonWriter.h"
#include "GameFramework/PlayerController.h"
#include "InputCoreTypes.h"
#include "Kismet/GameplayStatics.h"
#include "Misc/CommandLine.h"
#include "Misc/Paths.h"
#include "Misc/Parse.h"
#include "UnrealClient.h"
#include "TimerManager.h"

namespace
{
FString ReadLocalDialogue(const FString& Payload)
{
    TSharedPtr<FJsonObject> Data;
    if (!FJsonSerializer::Deserialize(TJsonReaderFactory<>::Create(Payload), Data) || !Data.IsValid())
        return FString();
    if (!Data->HasTypedField<EJson::String>(TEXT("response"))) return FString();
    FString Line;
    if (!Data->TryGetStringField(TEXT("response"), Line)) return FString();
    Line.ReplaceInline(TEXT("\r"), TEXT(" "));
    Line.ReplaceInline(TEXT("\n"), TEXT(" "));
    Line.ReplaceInline(TEXT("\t"), TEXT(" "));
    return Line.TrimStartAndEnd().Left(220);
}

FString StorySlot()
{
#if !UE_BUILD_SHIPPING
    FString RunId;
    if (FParse::Value(FCommandLine::Get(), TEXT("ashboundqastoryid="), RunId))
    {
        if (RunId.Len() == 32)
        {
            bool bHex = true;
            for (TCHAR Digit : RunId) bHex &= FChar::IsHexDigit(Digit);
            if (bHex) return TEXT("ASHBOUND_Story_QA_") + RunId;
        }
        UE_LOG(LogTemp, Error, TEXT("ASHBOUND_STORY invalid QA save ID"));
        return TEXT("ASHBOUND_Story_QA_Invalid");
    }
    if (FParse::Param(FCommandLine::Get(), TEXT("ashboundqastory")))
        return TEXT("ASHBOUND_Story_QA");
#endif
    return TEXT("ASHBOUND_Story");
}
}

AASHBOUNDSpellManager::AASHBOUNDSpellManager()
{
    PrimaryActorTick.bCanEverTick = true;
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
            InputComponent->BindKey(EKeys::V, IE_Pressed, this, &AASHBOUNDSpellManager::RefuseWrit);
            InputComponent->BindKey(EKeys::M, IE_Pressed, this, &AASHBOUNDSpellManager::ToggleMagnetism);
            InputComponent->BindKey(EKeys::B, IE_Pressed, this, &AASHBOUNDSpellManager::TriggerGenesis);
            InputComponent->BindKey(EKeys::J, IE_Pressed, this, &AASHBOUNDSpellManager::ToggleJournal);
            InputComponent->BindKey(EKeys::T, IE_Pressed, this, &AASHBOUNDSpellManager::SpeakWithWitness);
            InputComponent->BindKey(EKeys::Escape, IE_Pressed, this, &AASHBOUNDSpellManager::StopReading);
        }
    }
    SetStoryStage(0);

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

    Genesis = GetWorld()->SpawnActor<AASHBOUNDGenesis>(AASHBOUNDGenesis::StaticClass(),
        FVector(1450.0f, 625.0f, 108.0f), FRotator::ZeroRotator);
    Witness = GetWorld()->SpawnActor<AASHBOUNDWitness>(AASHBOUNDWitness::StaticClass(),
        FVector(1710.0f, -360.0f, 5.0f), FRotator(0, 90, 0));
    // Ground height from the authored valley surface at (3200, 850).
    Dreamer = GetWorld()->SpawnActor<AASHBOUNDDreamer>(AASHBOUNDDreamer::StaticClass(),
        FVector(3200.0f, 850.0f, -11.7f), FRotator(0, -90, 0));
    // A separate rooted dwelling near the archive path, clear of the Dreamer's bed.
    const FVector HomeProbe(3650.0f, 1450.0f, 900.0f);
    FHitResult HomeGround;
    FCollisionQueryParams HomeQuery(SCENE_QUERY_STAT(ASHBOUNDFungalHomeGround), false);
    if (GetWorld()->LineTraceSingleByChannel(HomeGround, HomeProbe,
        HomeProbe - FVector(0, 0, 1800), ECC_Visibility, HomeQuery))
    {
        FungalHome = GetWorld()->SpawnActor<AASHBOUNDFungalHome>(
            AASHBOUNDFungalHome::StaticClass(), HomeGround.ImpactPoint + FVector(0, 0, 3),
            FRotator::ZeroRotator);
    }
    else UE_LOG(LogTemp, Error, TEXT("ASHBOUND_FUNGAL_HOME ground not found"));
    // The authored valley remains intact. New ground streams beyond its east
    // edge as the player approaches, without loading distant terrain at entry.
    GetWorld()->SpawnActor<AASHBOUNDExpanse>(AASHBOUNDExpanse::StaticClass(),
        FVector::ZeroVector, FRotator::ZeroRotator);
    RestoreStory();
    // The first-person template may apply a stale mouse delta while its window
    // gains focus. Establish one authored entry view after possession settles.
    FTimerHandle EntryViewTimer;
    GetWorld()->GetTimerManager().SetTimer(EntryViewTimer,
        FTimerDelegate::CreateWeakLambda(this, [this]()
    {
        APlayerController* Controller = UGameplayStatics::GetPlayerController(this, 0);
        if (!Controller || !Controller->GetPawn()) return;
        FVector Eye;
        FRotator CurrentView;
        Controller->GetPlayerViewPoint(Eye, CurrentView);
        const FVector Target = !bSpokenToWitness && Witness.IsValid()
            ? Witness->GetActorLocation() + FVector(0, 0, 180)
            : Eye + FVector(1000, 0, 0);
        Controller->SetControlRotation((Target - Eye).Rotation());
        UE_LOG(LogTemp, Display, TEXT("ASHBOUND_ENTRY_VIEW yaw=%.1f pitch=%.1f"),
            Controller->GetControlRotation().Yaw, Controller->GetControlRotation().Pitch);
    }), 0.75f, false);
    UE_LOG(LogTemp, Display, TEXT("ASHBOUND living magic ready; lights require a source or player action, Q/E/R/F/M input"));

#if !UE_BUILD_SHIPPING
    if (FParse::Param(FCommandLine::Get(), TEXT("ashboundqafungalhome")))
    {
        FTimerHandle HomeTimer;
        GetWorld()->GetTimerManager().SetTimer(HomeTimer,
            FTimerDelegate::CreateWeakLambda(this, [this]()
        {
            AASHBOUNDFungalHome* Home = FungalHome.Get();
            const float Before = Home ? Home->GetVitality() : -1.0f;
            if (Home) Home->Nurture();
            const float After = Home ? Home->GetVitality() : -1.0f;
            const bool bPass = Home && Before >= 0.0f && After > Before && After <= 1.0f;
            UE_LOG(LogTemp, Display, TEXT("ASHBOUND_FUNGAL_HOME_QA before=%.2f after=%.2f pass=%d"),
                Before, After, bPass ? 1 : 0);
            if (!bPass) UE_LOG(LogTemp, Error, TEXT("ASHBOUND_FUNGAL_HOME_QA FAIL"));
        }), 1.0f, false);
    }
    if (FParse::Param(FCommandLine::Get(), TEXT("ashboundqalocaldialogue")))
    {
        const FString Good = ReadLocalDialogue(TEXT("{\"response\":\"Die Wurzeln erinnern sich.\\nHöre genauer hin.\"}"));
        const bool bPass = Good == TEXT("Die Wurzeln erinnern sich. Höre genauer hin.") &&
            ReadLocalDialogue(TEXT("{\"response\":123}")).IsEmpty() &&
            ReadLocalDialogue(TEXT("{")).IsEmpty();
        UE_LOG(LogTemp, Display, TEXT("ASHBOUND_LOCAL_DIALOGUE_QA pass=%d good=%d nonstring=%d malformed=%d"),
            bPass ? 1 : 0, Good == TEXT("Die Wurzeln erinnern sich. Höre genauer hin.") ? 1 : 0,
            ReadLocalDialogue(TEXT("{\"response\":123}")).IsEmpty() ? 1 : 0,
            ReadLocalDialogue(TEXT("{")).IsEmpty() ? 1 : 0);
        if (!bPass) UE_LOG(LogTemp, Error, TEXT("ASHBOUND_LOCAL_DIALOGUE_QA FAIL"));
    }
    if (FParse::Param(FCommandLine::Get(), TEXT("ashboundqaqwen")))
    {
        FTimerHandle DialogueTimer;
        GetWorld()->GetTimerManager().SetTimer(DialogueTimer,
            FTimerDelegate::CreateWeakLambda(this, [this]()
        {
            APlayerController* Controller = UGameplayStatics::GetPlayerController(this, 0);
            if (!Controller || !Controller->GetPawn() || !Witness.IsValid()) return;
            const FVector Position = Witness->GetActorLocation() + FVector(-230.0f, 0, 90.0f);
            Controller->GetPawn()->SetActorLocation(Position);
            Controller->SetControlRotation((Witness->GetActorLocation() + FVector(0, 0, 145) -
                Position - FVector(0, 0, 65)).Rotation());
            bSpokenToWitness = true;
            FTimerHandle RequestTimer;
            GetWorld()->GetTimerManager().SetTimer(RequestTimer,
                FTimerDelegate::CreateWeakLambda(this, [this]()
            {
                APlayerController* Current = UGameplayStatics::GetPlayerController(this, 0);
                FVector Eye;
                FRotator Look;
                if (!Current || !Witness.IsValid()) return;
                Current->GetPlayerViewPoint(Eye, Look);
                UE_LOG(LogTemp, Display, TEXT("ASHBOUND_LOCAL_DIALOGUE_QA reachable=%d eye=%s"),
                    Witness->CanSpeak(Eye, Look.Vector()) ? 1 : 0, *Eye.ToString());
                SpeakWithWitness();
            }), 0.25f, false);
        }), 1.0f, false);
    }
    if (FParse::Param(FCommandLine::Get(), TEXT("ashboundqastory")))
    {
        FTimerHandle WitnessTimer, BookTimer, DecisionTimer, SealsTimer, PassageTimer, FortTimer;
        GetWorld()->GetTimerManager().SetTimer(WitnessTimer, FTimerDelegate::CreateWeakLambda(this, [this]()
        {
            APlayerController* Controller = UGameplayStatics::GetPlayerController(this, 0);
            if (!Controller || !Controller->GetPawn() || !Witness.IsValid()) return;
            Controller->GetPawn()->SetActorLocation(FVector(1420, -360, 160));
            Controller->SetControlRotation((Witness->GetActorLocation() + FVector(0, 0, 145) -
                                            FVector(1420, -360, 225)).Rotation());
            FTimerHandle InteractTimer;
            GetWorld()->GetTimerManager().SetTimer(InteractTimer, FTimerDelegate::CreateWeakLambda(this, [this]()
            {
                StudyNearestBook();
                UE_LOG(LogTemp, Display, TEXT("ASHBOUND_STORY_QA witness=%d stage=%d"),
                    bSpokenToWitness ? 1 : 0, StoryStage);
            }), 0.3f, false);
        }), 1.0f, false);
        GetWorld()->GetTimerManager().SetTimer(BookTimer, FTimerDelegate::CreateWeakLambda(this, [this]()
        {
            APlayerController* Controller = UGameplayStatics::GetPlayerController(this, 0);
            if (!Controller || !Controller->GetPawn()) return;
            Controller->GetPawn()->SetActorLocation(FVector(2720, 0, 160));
            Controller->SetControlRotation(FRotator(-8, 0, 0));
            FTimerHandle InteractTimer;
            GetWorld()->GetTimerManager().SetTimer(InteractTimer, FTimerDelegate::CreateWeakLambda(this, [this]()
            {
                StudyNearestBook();
                UpdateStory(0.2f);
                UE_LOG(LogTemp, Display, TEXT("ASHBOUND_STORY_QA book_stage=%d"), StoryStage);
            }), 0.3f, false);
        }), 2.0f, false);
        GetWorld()->GetTimerManager().SetTimer(DecisionTimer, FTimerDelegate::CreateWeakLambda(this, [this]()
        {
            StopReading();
            APlayerController* Controller = UGameplayStatics::GetPlayerController(this, 0);
            if (!Controller || !Controller->GetPawn() || !Dreamer.IsValid()) return;
            const FVector Position(3200, 580, 160);
            Controller->GetPawn()->SetActorLocation(Position);
            Controller->SetControlRotation((Dreamer->GetActorLocation() + FVector(0, 0, 90)
                                            - Position - FVector(0, 0, 65)).Rotation());
            // StopReading blends from the book camera back to the pawn. Wait
            // for that blend before testing the real gaze-gated input path.
            FTimerHandle ReturnViewTimer;
            GetWorld()->GetTimerManager().SetTimer(ReturnViewTimer,
                FTimerDelegate::CreateWeakLambda(this, [this]()
            {
                APlayerController* View = UGameplayStatics::GetPlayerController(this, 0);
                if (View && Dreamer.IsValid())
                {
                    FVector Eye;
                    FRotator Look;
                    View->GetPlayerViewPoint(Eye, Look);
                    UE_LOG(LogTemp, Display, TEXT("ASHBOUND_STORY_QA dreamer_gaze=%d eye=%s"),
                        Dreamer->CanDecide(Eye, Look.Vector()) ? 1 : 0, *Eye.ToString());
                }
                RefuseWrit();
                int32 Studied = 0;
                for (TActorIterator<AASHBOUNDGrimoire> It(GetWorld()); It; ++It)
                {
                    if (!It->IsStudied()) It->Study();
                    if (It->IsStudied()) ++Studied;
                }
                StopReading();
                UpdateStory(0.2f);
                UE_LOG(LogTemp, Display, TEXT("ASHBOUND_STORY_QA antiquest=%d books=%d"),
                    StoryMemory && StoryMemory->WritDecision == 2 ? 1 : 0, Studied);
            }), 0.65f, false);
        }), 2.6f, false);
        GetWorld()->GetTimerManager().SetTimer(SealsTimer, FTimerDelegate::CreateWeakLambda(this, [this]()
        {
            for (TActorIterator<AASHBOUNDSeal> It(GetWorld()); It; ++It)
            {
                const FVector Target = It->GetActorLocation() + FVector(-90, 0, 0);
                AASHBOUNDSpell* Spell = GetWorld()->SpawnActor<AASHBOUNDSpell>(
                    AASHBOUNDSpell::StaticClass(), Target + FVector(-180, 0, 0), FRotator::ZeroRotator);
                if (Spell) Spell->Initialize(It->GetRequiredSchool(), Target, false);
            }
        }), 3.0f, false);
        GetWorld()->GetTimerManager().SetTimer(PassageTimer, FTimerDelegate::CreateWeakLambda(this, [this]()
        {
            APlayerController* Controller = UGameplayStatics::GetPlayerController(this, 0);
            if (!Controller || !Controller->GetPawn()) return;
            Controller->GetPawn()->SetActorLocation(FVector(4340, 0, 160));
            UpdateStory(0.2f);
            UE_LOG(LogTemp, Display, TEXT("ASHBOUND_STORY_QA passage_stage=%d"), StoryStage);
        }), 6.0f, false);
        GetWorld()->GetTimerManager().SetTimer(FortTimer, FTimerDelegate::CreateWeakLambda(this, [this]()
        {
            APlayerController* Controller = UGameplayStatics::GetPlayerController(this, 0);
            if (!Controller || !Controller->GetPawn()) return;
            Controller->GetPawn()->SetActorLocation(FVector(5840, 0, 160));
            UpdateStory(0.2f);
            bool bGateOpen = false;
            for (TActorIterator<AASHBOUNDArchiveGate> It(GetWorld()); It; ++It)
                bGateOpen |= It->IsOpen();
            const bool bPass = StoryStage == 5 && StoryMemory &&
                StoryMemory->WritDecision == 2 && Dreamer.IsValid() &&
                Dreamer->GetRememberedVolumes() == 3 && bGateOpen;
            UE_LOG(LogTemp, Display, TEXT("ASHBOUND_STORY_QA final_stage=%d memory=%d gate=%d pass=%d"),
                StoryStage, Dreamer.IsValid() ? Dreamer->GetRememberedVolumes() : -1,
                bGateOpen ? 1 : 0, bPass ? 1 : 0);
            if (!bPass)
                UE_LOG(LogTemp, Error, TEXT("ASHBOUND_STORY_QA FAIL"));
        }), 7.0f, false);
    }
    if (FParse::Param(FCommandLine::Get(), TEXT("ashboundqawritdark")))
    {
        FTimerHandle ChoiceTimer, CheckTimer;
        GetWorld()->GetTimerManager().SetTimer(ChoiceTimer, FTimerDelegate::CreateWeakLambda(this, [this]()
        {
            bSpokenToWitness = true;
            if (StoryMemory) StoryMemory->bMetWitness = true;
            if (AASHBOUNDWitness* Keeper = Witness.Get()) Keeper->Awaken();
            for (TActorIterator<AASHBOUNDGrimoire> It(GetWorld()); It; ++It)
                if (It->VolumeIndex == 0 && !It->IsStudied()) It->Study();
            StopReading();
            DecideWrit(1);
        }), 1.0f, false);
        GetWorld()->GetTimerManager().SetTimer(CheckTimer, FTimerDelegate::CreateWeakLambda(this, [this]()
        {
            bool bGateOpen = false;
            for (TActorIterator<AASHBOUNDArchiveGate> It(GetWorld()); It; ++It)
                bGateOpen |= It->IsOpen();
            const bool bPass = StoryMemory && StoryMemory->WritDecision == 1 && bGateOpen;
            UE_LOG(LogTemp, Display, TEXT("ASHBOUND_WRIT_DARK_QA decision=%d gate=%d pass=%d"),
                StoryMemory ? StoryMemory->WritDecision : -1, bGateOpen ? 1 : 0, bPass ? 1 : 0);
            if (!bPass) UE_LOG(LogTemp, Error, TEXT("ASHBOUND_WRIT_DARK_QA FAIL"));
        }), 4.0f, false);
    }
    if (FParse::Param(FCommandLine::Get(), TEXT("ashboundqagenesis")))
    {
        FTimerHandle GenesisTimer;
        GetWorld()->GetTimerManager().SetTimer(GenesisTimer,
            FTimerDelegate::CreateUObject(this, &AASHBOUNDSpellManager::TriggerGenesis), 1.5f, false);
    }
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
    if (FParse::Param(FCommandLine::Get(), TEXT("ashboundqafortview")))
    {
        FTimerHandle FortViewTimer;
        GetWorld()->GetTimerManager().SetTimer(FortViewTimer,
            FTimerDelegate::CreateWeakLambda(this, [this]()
        {
            APlayerController* Controller = UGameplayStatics::GetPlayerController(this, 0);
            if (!Controller || !Controller->GetPawn()) return;
            const FVector Position(5200.0f, -1150.0f, 225.0f);
            const FVector Focus(6450.0f, 0.0f, 220.0f);
            Controller->GetPawn()->SetActorLocation(Position);
            Controller->SetControlRotation((Focus - Position - FVector(0, 0, 65)).Rotation());
            UE_LOG(LogTemp, Display, TEXT("ASHBOUND_FORT_VIEW_QA position=%s"), *Position.ToString());
        }), 1.0f, false);
    }
    if (FParse::Param(FCommandLine::Get(), TEXT("ashboundqaexpanseview")))
    {
        FTimerHandle ExpanseViewTimer;
        GetWorld()->GetTimerManager().SetTimer(ExpanseViewTimer,
            FTimerDelegate::CreateWeakLambda(this, [this]()
        {
            APlayerController* Controller = UGameplayStatics::GetPlayerController(this, 0);
            if (!Controller || !Controller->GetPawn()) return;
            const FVector Position(14500.0f, -300.0f, 1100.0f);
            const FVector Focus(22000.0f, 1000.0f, 550.0f);
            Controller->GetPawn()->SetActorLocation(Position);
            Controller->SetControlRotation((Focus - Position - FVector(0, 0, 65)).Rotation());
            UE_LOG(LogTemp, Display, TEXT("ASHBOUND_EXPANSE_VIEW_QA position=%s"),
                *Position.ToString());
        }), 1.2f, false);
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
    // Sample the west arch at camera height. The old map disabled collision on
    // its visible stone and substituted two narrow invisible blocks.
    for (const float Y : { -340.0f, -280.0f, -220.0f, 0.0f, 220.0f, 280.0f, 340.0f })
    {
        FHitResult Hit;
        FCollisionQueryParams Query(SCENE_QUERY_STAT(ASHBOUNDQAPortal), false);
        Query.AddIgnoredActor(this);
        const bool bHit = World->SweepSingleByChannel(
            Hit, FVector(2090.0f, Y, 225.0f), FVector(2490.0f, Y, 225.0f),
            FQuat::Identity, ECC_Pawn,
            FCollisionShape::MakeCapsule(34.0f, 88.0f), Query);
        const UStaticMeshComponent* Component =
            bHit ? Cast<UStaticMeshComponent>(Hit.GetComponent()) : nullptr;
        const UStaticMesh* Mesh = Component ? Component->GetStaticMesh() : nullptr;
        const bool bStone = Mesh && Mesh->GetName() == TEXT("modular_fort_01_wall_thin_gate_01");
        const bool bPassed = Y == 0.0f ? !bHit : bHit && bStone;
        bAllPassed &= bPassed;
        UE_LOG(LogTemp, Display,
            TEXT("ASHBOUND_PORTAL_PAWN_SAMPLE y=%.0f hit=%d mesh=%s x=%.1f pass=%d"),
            Y, bHit ? 1 : 0, Mesh ? *Mesh->GetName() : TEXT("NONE"),
            bHit ? Hit.ImpactPoint.X : 0.0f, bPassed ? 1 : 0);
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

void AASHBOUNDSpellManager::TriggerGenesis()
{
    if (AASHBOUNDGenesis* Core = Genesis.Get()) Core->Birth();
}

void AASHBOUNDSpellManager::ToggleJournal()
{
    bJournalOpen = !bJournalOpen;
}

void AASHBOUNDSpellManager::SpeakWithWitness()
{
    APlayerController* Player = UGameplayStatics::GetPlayerController(this, 0);
    AASHBOUNDWitness* Keeper = Witness.Get();
    if (!Player || !Keeper || !bSpokenToWitness || bLocalDialoguePending) return;
    FVector Eye;
    FRotator Look;
    Player->GetPlayerViewPoint(Eye, Look);
    if (!Keeper->CanSpeak(Eye, Look.Vector())) return;

    int32 Studied = 0;
    for (TActorIterator<AASHBOUNDGrimoire> It(GetWorld()); It; ++It)
        if (It->IsStudied()) ++Studied;
    const int32 Decision = StoryMemory ? StoryMemory->WritDecision : 0;
    const float HomeVitality = FungalHome.IsValid() ? FungalHome->GetVitality() : 0.0f;
    const FString Prompt = FString::Printf(
        TEXT("Du bist die Zeugin im eigenständigen Fantasyspiel ASHBOUND. Antworte auf Deutsch mit genau einem kurzen, atmosphärischen Satz aus deiner Perspektive. Erfinde keine neue Quest, keinen Spielbefehl und keine Tatsache über den Spieler. Bekannte Weltfakten: Kapitelstand %d; gelesene Archivbücher %d von 3; Entscheidung zum Archivbefehl %d (0 offen, 1 angenommen, 2 verweigert); Vitalität des lebenden Pilzhauses %.2f von 1. Sprich über eine dieser Beobachtungen."),
        StoryStage, Studied, Decision, HomeVitality);

    TSharedRef<FJsonObject> Body = MakeShared<FJsonObject>();
    Body->SetStringField(TEXT("model"), TEXT("qwen2.5:14b"));
    Body->SetStringField(TEXT("prompt"), Prompt);
    Body->SetBoolField(TEXT("stream"), false);
    TSharedRef<FJsonObject> Options = MakeShared<FJsonObject>();
    Options->SetNumberField(TEXT("num_predict"), 72);
    Options->SetNumberField(TEXT("temperature"), 0.6);
    Body->SetObjectField(TEXT("options"), Options);
    FString Payload;
    if (!FJsonSerializer::Serialize(Body, TJsonWriterFactory<>::Create(&Payload))) return;

    TSharedRef<IHttpRequest, ESPMode::ThreadSafe> Request = FHttpModule::Get().CreateRequest();
    Request->SetURL(TEXT("http://127.0.0.1:11434/api/generate"));
    Request->SetVerb(TEXT("POST"));
    Request->SetHeader(TEXT("Content-Type"), TEXT("application/json"));
    Request->SetContentAsString(Payload);
    Request->SetTimeout(45.0f);
    bLocalDialoguePending = true;
    StoryLine = TEXT("ZEUGIN: Ich suche nach Worten ...");
    StoryLineRemaining = 47.0f;
    UE_LOG(LogTemp, Display, TEXT("ASHBOUND_LOCAL_DIALOGUE requested model=qwen2.5:14b"));
    const TWeakObjectPtr<AASHBOUNDSpellManager> WeakSelf(this);
    Request->OnProcessRequestComplete().BindLambda(
        [WeakSelf](FHttpRequestPtr, FHttpResponsePtr Response, bool bSucceeded)
    {
        AASHBOUNDSpellManager* Self = WeakSelf.Get();
        if (!Self) return;
        Self->bLocalDialoguePending = false;
        const FString Line = bSucceeded && Response.IsValid() && Response->GetResponseCode() == 200
            ? ReadLocalDialogue(Response->GetContentAsString()) : FString();
        Self->StoryLine = Line.IsEmpty()
            ? TEXT("ZEUGIN: Die Wurzeln tragen Erinnerungen; mein Weg ist noch offen.")
            : TEXT("ZEUGIN: ") + Line;
        Self->StoryLineRemaining = 12.0f;
        UE_LOG(LogTemp, Display, TEXT("ASHBOUND_LOCAL_DIALOGUE source=%s"),
            Line.IsEmpty() ? TEXT("AUTHORED_FALLBACK") : TEXT("LOCAL_QWEN"));
    });
    if (!Request->ProcessRequest())
    {
        bLocalDialoguePending = false;
        StoryLine = TEXT("ZEUGIN: Die Wurzeln tragen Erinnerungen; mein Weg ist noch offen.");
        StoryLineRemaining = 12.0f;
    }
}

void AASHBOUNDSpellManager::RestoreStory()
{
    const FString Slot = StorySlot();
    if (UGameplayStatics::DoesSaveGameExist(Slot, 0))
    {
        StoryMemory = Cast<UASHBOUNDStoryMemory>(UGameplayStatics::LoadGameFromSlot(Slot, 0));
        if (!StoryMemory)
        {
            UE_LOG(LogTemp, Error, TEXT("ASHBOUND_STORY_SAVE unreadable; original save preserved"));
            return;
        }
    }
    else
    {
        StoryMemory = Cast<UASHBOUNDStoryMemory>(
            UGameplayStatics::CreateSaveGameObject(UASHBOUNDStoryMemory::StaticClass()));
    }
    if (!StoryMemory) return;
    if (StoryMemory->WritDecision == 0 &&
        (!StoryMemory->ChargedSchools.IsEmpty() || StoryMemory->bReachedFort))
    {
        // The pre-choice chapter used the three seals. Keep that completed
        // route intact instead of re-locking an existing save.
        StoryMemory->WritDecision = 3;
        SaveStory();
        UE_LOG(LogTemp, Display, TEXT("ASHBOUND_WRIT legacy seal route preserved"));
    }
    if (AASHBOUNDDreamer* Sleeper = Dreamer.Get())
        Sleeper->SetDecision(StoryMemory->WritDecision);
    bSpokenToWitness = StoryMemory->bMetWitness;
    bReachedFort = StoryMemory->bReachedFort;
    if (bSpokenToWitness)
    {
        if (AASHBOUNDWitness* Keeper = Witness.Get()) Keeper->Awaken();
        SetStoryStage(bReachedFort ? 5 : 1);
    }
    if (!StoryMemory->ChargedSchools.IsEmpty())
    {
        FTimerHandle RestoreTimer;
        GetWorld()->GetTimerManager().SetTimer(RestoreTimer, FTimerDelegate::CreateWeakLambda(this, [this]()
        {
            if (!StoryMemory) return;
            bRestoringStory = true;
            for (TActorIterator<AASHBOUNDSeal> It(GetWorld()); It; ++It)
            {
                if (StoryMemory->ChargedSchools.Contains(It->GetRequiredSchool()))
                    It->Activate(It->GetRequiredSchool());
            }
            bRestoringStory = false;
            TryOpenArchive();
            UE_LOG(LogTemp, Display, TEXT("ASHBOUND_STORY_SAVE restored seals=%d fort=%d"),
                StoryMemory->ChargedSchools.Num(), bReachedFort ? 1 : 0);
        }), 0.6f, false);
    }
    else
    {
        TryOpenArchive();
        UE_LOG(LogTemp, Display, TEXT("ASHBOUND_STORY_SAVE restored seals=0 fort=%d"),
            bReachedFort ? 1 : 0);
    }
}

void AASHBOUNDSpellManager::SaveStory()
{
    if (!StoryMemory) return;
    if (!UGameplayStatics::SaveGameToSlot(StoryMemory, StorySlot(), 0))
        UE_LOG(LogTemp, Error, TEXT("ASHBOUND_STORY_SAVE write failed"));
}

void AASHBOUNDSpellManager::OnSealActivated(int32 School)
{
    if (!StoryMemory || bRestoringStory) return;
    StoryMemory->ChargedSchools.AddUnique(School);
    SaveStory();
    TryOpenArchive();
    UE_LOG(LogTemp, Display, TEXT("ASHBOUND_STORY_SAVE seal=%d count=%d"),
        School, StoryMemory->ChargedSchools.Num());
}

void AASHBOUNDSpellManager::TryOpenArchive()
{
    if (!StoryMemory || !GetWorld()) return;
    bool bMayOpen = StoryMemory->WritDecision == 1;
    if (StoryMemory->WritDecision == 2)
    {
        int32 Studied = 0;
        for (TActorIterator<AASHBOUNDGrimoire> It(GetWorld()); It; ++It)
            if (It->IsStudied()) ++Studied;
        int32 Charged = 0;
        for (TActorIterator<AASHBOUNDSeal> It(GetWorld()); It; ++It)
            if (It->IsActive()) ++Charged;
        bMayOpen = Studied >= 3 && Charged >= 3 && Dreamer.IsValid() &&
            Dreamer->GetRememberedVolumes() == 3;
    }
    if (StoryMemory->WritDecision == 3)
    {
        int32 Charged = 0;
        for (TActorIterator<AASHBOUNDSeal> It(GetWorld()); It; ++It)
            if (It->IsActive()) ++Charged;
        bMayOpen = Charged >= 3 || StoryMemory->bReachedFort;
    }
    if (!bMayOpen) return;
    for (TActorIterator<AASHBOUNDArchiveGate> It(GetWorld()); It; ++It)
        It->OpenGate();
}

void AASHBOUNDSpellManager::SetStoryStage(int32 NewStage)
{
    if (NewStage == StoryStage) return;
    StoryStage = NewStage;
    StoryLineRemaining = 9.0f;
    switch (StoryStage)
    {
    case 0:
        Objective = TEXT("Finde die Zeugin am Weg zum Archiv");
        JournalLine = TEXT("Eine steinerne Gestalt wacht links neben dem Aschepfad.");
        StoryLine = TEXT("Ein Licht regt sich am alten Steinsockel.  J öffnet dein Journal.");
        break;
    case 1:
        Objective = TEXT("Lies Ilyras Buch im Rundarchiv");
        JournalLine = TEXT("Die Zeugin nennt Ilyras Buch am mittleren Lesepult.");
        StoryLine = TEXT("ZEUGIN: Drei Zeichen halten den Ostweg. Lerne zuerst, was sie bewahren.");
        break;
    case 2:
        Objective = TEXT("Erwecke die drei Archivzeichen mit Q, E und R");
        JournalLine = StoryMemory && StoryMemory->WritDecision == 2
            ? TEXT("Die Hüterin erinnert sich: Das Archiv selbst schrieb den Opferbefehl für sein altes Tor.")
            : TEXT("Resonanz, Glut und Neufassung antworten auf je ein eigenes Zeichen.");
        StoryLine = StoryMemory && StoryMemory->WritDecision == 2
            ? TEXT("HÜTERIN: Ihre Regel ist nicht die einzige. Drei Zeichen genügen.")
            : TEXT("Die Schrift bleibt in dir. Jetzt antworten die Zeichen auf deine Zauber.");
        break;
    case 6:
        Objective = TEXT("Finde die Schlafende nördlich des Archivs");
        JournalLine = TEXT("Der Archivbefehl verlangt ihr Leben. An ihrem Lager: F vollstrecken, V verweigern.");
        StoryLine = TEXT("ARCHIV: Eine Schlafende für ein offenes Tor. Die Zeugin schweigt.");
        break;
    case 7:
        Objective = TEXT("Gegenweg: Lies alle drei Bücher");
        JournalLine = TEXT("Du hast verweigert. Die Hüterin erinnert sich durch Ilyra, Neral und Kael.");
        StoryLine = TEXT("SCHLAFENDE: Was sie als Preis bezeichneten, war ein Mensch.");
        break;
    case 3:
        Objective = TEXT("Durchquere das geöffnete Osttor");
        JournalLine = StoryMemory && StoryMemory->WritDecision == 1
            ? TEXT("Das Archiv nahm den dunklen Preis. Ihr Licht bleibt aus.")
            : StoryMemory && StoryMemory->WritDecision == 2
                ? TEXT("Die Hüterin lebt. Schrift und drei Zeichen öffneten den Ostweg.")
                : TEXT("Die drei Archivzeichen öffneten den Ostweg.");
        StoryLine = TEXT("Das Tor hebt sich. Hinter dem Archiv beginnt eine andere Geschichte.");
        break;
    case 4:
        Objective = TEXT("Folge dem Weg bis zur alten Festung");
        JournalLine = TEXT("Jenseits des Archivs liegt die verlassene Festung im Aschetal.");
        StoryLine = TEXT("Du hast die Schwelle überschritten. Folge dem Tal nach Osten.");
        break;
    default:
        Objective = TEXT("Kapitel I abgeschlossen: Die Festung erreicht");
        JournalLine = StoryMemory && StoryMemory->WritDecision == 1
            ? TEXT("Die Festung ist erreicht. Das Archiv öffnete sich auf Kosten der Schlafenden.")
            : StoryMemory && StoryMemory->WritDecision == 2
                ? TEXT("Die Festung ist erreicht. Die Schlafende lebt; der Gegenweg bleibt Teil deiner Geschichte.")
                : TEXT("Du hast die Zeugin gehört, gelesen und die Festung erreicht.");
        StoryLine = TEXT("ZEUGIN: Ein Weg ist offen. Was hier erwacht, bleibt deine Entscheidung.");
        break;
    }
    UE_LOG(LogTemp, Display, TEXT("ASHBOUND_STORY stage=%d objective=%s"), StoryStage, *Objective);
}

void AASHBOUNDSpellManager::UpdateStory(float DeltaSeconds)
{
    StoryLineRemaining = FMath::Max(0.0f, StoryLineRemaining - DeltaSeconds);
    if (StoryLineRemaining <= 0.0f) StoryLine.Empty();
    StoryCheckRemaining -= DeltaSeconds;
    if (StoryCheckRemaining > 0.0f) return;
    StoryCheckRemaining = 0.16f;

    APlayerController* Player = UGameplayStatics::GetPlayerController(this, 0);
    if (!Player || !Player->GetPawn()) return;
    FVector Eye;
    FRotator Look;
    Player->GetPlayerViewPoint(Eye, Look);
    if (!bSpokenToWitness && Witness.IsValid())
    {
        const FVector Delta = Witness->GetActorLocation() - Eye;
        const FVector Toward = FVector(Delta.X, Delta.Y, 0.0f).GetSafeNormal();
        const FVector Ahead = FRotator(0.0f, Look.Yaw, 0.0f).Vector();
        const float Facing = FVector::DotProduct(Ahead, Toward);
        const float Side = FVector::CrossProduct(Ahead, Toward).Z;
        const TCHAR* Direction = Facing > 0.90f ? TEXT("vor dir") :
            Facing < -0.90f ? TEXT("hinter dir") :
            Side > 0.0f ? TEXT("links") : TEXT("rechts");
        Objective = FString::Printf(TEXT("Zeugin %s  %d m"),
            Direction, FMath::RoundToInt(Delta.Size2D() / 100.0f));
    }
    InteractionPrompt.Empty();
    if (AASHBOUNDWitness* Keeper = Witness.Get())
    {
        if (Keeper->CanSpeak(Eye, Look.Vector()))
            InteractionPrompt = bSpokenToWitness
                ? TEXT("T  Zeugin fragen (lokales Qwen)    F  Geschichte")
                : TEXT("F  Mit der Zeugin sprechen");
    }
    if (StoryMemory && StoryMemory->WritDecision == 0 && bSpokenToWitness)
    {
        bool bReadIlyra = false;
        for (TActorIterator<AASHBOUNDGrimoire> It(GetWorld()); It; ++It)
            if (It->VolumeIndex == 0) bReadIlyra |= It->IsStudied();
        if (bReadIlyra && Dreamer.IsValid() && Dreamer->CanDecide(Eye, Look.Vector()))
            InteractionPrompt = TEXT("F  Befehl vollstrecken    V  Verweigern");
    }
    if (StoryMemory && StoryMemory->WritDecision == 2 && Dreamer.IsValid() &&
        Dreamer->CanDecide(Eye, Look.Vector()))
        InteractionPrompt = TEXT("F  Mit der Hüterin sprechen");
    if (InteractionPrompt.IsEmpty())
    {
        for (TActorIterator<AASHBOUNDGrimoire> It(GetWorld()); It; ++It)
        {
            const FVector Direction = It->GetActorLocation() - Eye;
            if (Direction.SizeSquared() < FMath::Square(300.0f) &&
                FVector::DotProduct(Direction.GetSafeNormal(), Look.Vector()) > 0.50f)
            {
                InteractionPrompt = TEXT("F  Buch lesen / Seite wenden   Esc  Zurück");
                break;
            }
        }
    }

    if (!bSpokenToWitness) return;
    if (bReachedFort) { SetStoryStage(5); return; }
    bool bFirstBookStudied = false;
    for (TActorIterator<AASHBOUNDGrimoire> It(GetWorld()); It; ++It)
    {
        if (It->VolumeIndex == 0) bFirstBookStudied |= It->IsStudied();
    }
    if (!bFirstBookStudied) { SetStoryStage(1); return; }

    if (StoryMemory && StoryMemory->WritDecision == 0)
    {
        SetStoryStage(6);
        return;
    }

    if (StoryMemory && StoryMemory->WritDecision == 2)
    {
        int32 Studied = 0;
        for (TActorIterator<AASHBOUNDGrimoire> It(GetWorld()); It; ++It)
            if (It->IsStudied()) ++Studied;
        if (AASHBOUNDDreamer* Sleeper = Dreamer.Get())
            Sleeper->LearnFromBooks(Studied);
        if (Studied < 3)
        {
            SetStoryStage(7);
            Objective = FString::Printf(TEXT("Gegenweg: Bücher lesen  %d / 3"), Studied);
            return;
        }
    }

    int32 Charged = 0;
    for (TActorIterator<AASHBOUNDSeal> It(GetWorld()); It; ++It)
        if (It->IsActive()) ++Charged;
    if (StoryMemory && StoryMemory->WritDecision != 1 && Charged < 3)
    {
        SetStoryStage(2);
        Objective = FString::Printf(TEXT("Archivzeichen erwecken  %d / 3"), Charged);
        return;
    }
    TryOpenArchive();
    if (Player->GetPawn()->GetActorLocation().X < 4200.0f)
    {
        SetStoryStage(3);
        return;
    }
    if (Player->GetPawn()->GetActorLocation().X < 5750.0f)
    {
        SetStoryStage(4);
        return;
    }
    bReachedFort = true;
    if (StoryMemory) StoryMemory->bReachedFort = true;
    SaveStory();
    SetStoryStage(5);
}

void AASHBOUNDSpellManager::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);
    UpdateStory(DeltaSeconds);
    AStaticMeshActor* Relic = MagneticRelic.Get();
    APlayerController* Player = UGameplayStatics::GetPlayerController(this, 0);
    if (!Relic || !Player) return;
    UStaticMeshComponent* Mesh = Relic->GetStaticMeshComponent();
    if (!Mesh || !Mesh->IsSimulatingPhysics())
    {
        MagneticRelic.Reset();
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
    UE_LOG(LogTemp, Display, TEXT("ASHBOUND_MAGNET attracted %s"), *Selected->GetName());
}

void AASHBOUNDSpellManager::StudyNearestBook()
{
    APlayerController* Player = UGameplayStatics::GetPlayerController(this, 0);
    if (!Player || !GetWorld()) return;
    FVector Eye;
    FRotator Look;
    Player->GetPlayerViewPoint(Eye, Look);
    if (StoryMemory && StoryMemory->WritDecision == 0 && bSpokenToWitness && Dreamer.IsValid())
    {
        bool bReadIlyra = false;
        for (TActorIterator<AASHBOUNDGrimoire> It(GetWorld()); It; ++It)
            if (It->VolumeIndex == 0) bReadIlyra |= It->IsStudied();
        if (bReadIlyra && Dreamer->CanDecide(Eye, Look.Vector()))
        {
            DecideWrit(1);
            return;
        }
    }
    if (StoryMemory && StoryMemory->WritDecision == 2 && Dreamer.IsValid() &&
        Dreamer->CanDecide(Eye, Look.Vector()))
    {
        StoryLine = Dreamer->GetRememberedVolumes() == 3
            ? TEXT("HÜTERIN: Das Archiv schrieb den Befehl. Ich kann jetzt seine andere Regel lesen.")
            : TEXT("HÜTERIN: Die drei Bücher tragen Teile meiner Erinnerung.");
        StoryLineRemaining = 9.0f;
        return;
    }
    if (AASHBOUNDWitness* Keeper = Witness.Get())
    {
        if (Keeper->CanSpeak(Eye, Look.Vector()))
        {
            bSpokenToWitness = true;
            if (StoryMemory) StoryMemory->bMetWitness = true;
            SaveStory();
            Keeper->Awaken();
            SetStoryStage(1);
            UE_LOG(LogTemp, Display, TEXT("ASHBOUND_STORY dialogue witness=1"));
            return;
        }
    }
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

void AASHBOUNDSpellManager::RefuseWrit()
{
    if (!StoryMemory || StoryMemory->WritDecision != 0 || !bSpokenToWitness || !Dreamer.IsValid()) return;
    APlayerController* Player = UGameplayStatics::GetPlayerController(this, 0);
    if (!Player) return;
    FVector Eye;
    FRotator Look;
    Player->GetPlayerViewPoint(Eye, Look);
    bool bReadIlyra = false;
    for (TActorIterator<AASHBOUNDGrimoire> It(GetWorld()); It; ++It)
        if (It->VolumeIndex == 0) bReadIlyra |= It->IsStudied();
    if (bReadIlyra && Dreamer->CanDecide(Eye, Look.Vector())) DecideWrit(2);
}

void AASHBOUNDSpellManager::DecideWrit(int32 Decision)
{
    if (!StoryMemory || StoryMemory->WritDecision != 0 || (Decision != 1 && Decision != 2)) return;
    StoryMemory->WritDecision = Decision;
    SaveStory();
    if (AASHBOUNDDreamer* Sleeper = Dreamer.Get()) Sleeper->SetDecision(Decision);
    SetStoryStage(Decision == 1 ? 3 : 7);
    TryOpenArchive();
    UE_LOG(LogTemp, Display, TEXT("ASHBOUND_WRIT decision=%d save=1"), Decision);
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
