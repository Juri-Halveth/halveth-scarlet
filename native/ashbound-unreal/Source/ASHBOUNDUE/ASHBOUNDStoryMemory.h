#pragma once

#include "CoreMinimal.h"
#include "GameFramework/SaveGame.h"
#include "ASHBOUNDStoryMemory.generated.h"

// Save only authored chapter facts. The map reconstructs physical actors.
UCLASS()
class ASHBOUNDUE_API UASHBOUNDStoryMemory : public USaveGame
{
    GENERATED_BODY()

public:
    UPROPERTY()
    bool bMetWitness = false;

    UPROPERTY()
    TArray<int32> ChargedSchools;

    UPROPERTY()
    bool bReachedFort = false;

    // 0 undecided, 1 the archive's lethal writ, 2 refusal, 3 legacy chapter.
    UPROPERTY()
    int32 WritDecision = 0;
};
