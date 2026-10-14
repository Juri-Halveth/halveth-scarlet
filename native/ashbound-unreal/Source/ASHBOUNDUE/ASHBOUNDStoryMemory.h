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
};
