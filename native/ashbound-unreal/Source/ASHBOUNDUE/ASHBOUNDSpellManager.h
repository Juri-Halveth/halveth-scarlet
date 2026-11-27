#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "ASHBOUNDSpellManager.generated.h"

class AStaticMeshActor;
class AASHBOUNDGenesis;
class AASHBOUNDWitness;
class AASHBOUNDDreamer;
class AASHBOUNDFungalHome;
class UASHBOUNDStoryMemory;

UCLASS()
class ASHBOUNDUE_API AASHBOUNDSpellManager : public AActor
{
    GENERATED_BODY()

public:
    AASHBOUNDSpellManager();
    virtual void Tick(float DeltaSeconds) override;
    const FString& GetObjective() const { return Objective; }
    const FString& GetJournalLine() const { return JournalLine; }
    const FString& GetInteractionPrompt() const { return InteractionPrompt; }
    const FString& GetStoryLine() const { return StoryLine; }
    bool IsJournalOpen() const { return bJournalOpen; }
    int32 GetStoryStage() const { return StoryStage; }
    void OnSealActivated(int32 School);
    void TryOpenArchive();

protected:
    virtual void BeginPlay() override;

private:
    void CastResonance();
    void CastEmber();
    void CastReweave();
    void CastSchool(int32 School);
#if !UE_BUILD_SHIPPING
    void VerifyTerrainCollision();
#endif
    void StudyNearestBook();
    void RefuseWrit();
    void DecideWrit(int32 Decision);
    void StopReading();
    void ToggleMagnetism();
    void TriggerGenesis();
    void ToggleJournal();
    void SpeakWithWitness();
    void UpdateStory(float DeltaSeconds);
    void SetStoryStage(int32 NewStage);
    void RestoreStory();
    void SaveStory();
    TWeakObjectPtr<AStaticMeshActor> MagneticRelic;
    TWeakObjectPtr<AASHBOUNDGenesis> Genesis;
    TWeakObjectPtr<AASHBOUNDWitness> Witness;
    TWeakObjectPtr<AASHBOUNDDreamer> Dreamer;
    TWeakObjectPtr<AASHBOUNDFungalHome> FungalHome;
    UPROPERTY()
    TObjectPtr<UASHBOUNDStoryMemory> StoryMemory;
    FString Objective;
    FString JournalLine;
    FString InteractionPrompt;
    FString StoryLine;
    float StoryLineRemaining = 0.0f;
    float StoryCheckRemaining = 0.0f;
    int32 StoryStage = -1;
    bool bSpokenToWitness = false;
    bool bJournalOpen = false;
    bool bRestoringStory = false;
    bool bLocalDialoguePending = false;
    bool bReachedFort = false;
};
