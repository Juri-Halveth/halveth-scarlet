#pragma once

#include "CoreMinimal.h"
#include "GameFramework/SaveGame.h"
#include "ASHBOUNDBookMemory.generated.h"

// Only acquired knowledge is persisted; physical objects stay in the level.
UCLASS()
class ASHBOUNDUE_API UASHBOUNDBookMemory : public USaveGame
{
    GENERATED_BODY()

public:
    UPROPERTY()
    TArray<int32> StudiedVolumes;
};
