#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "ASHBOUNDGameMode.generated.h"

UCLASS()
class ASHBOUNDUE_API AASHBOUNDGameMode : public AGameModeBase
{
    GENERATED_BODY()

public:
    AASHBOUNDGameMode();
    virtual AActor* ChoosePlayerStart_Implementation(AController* Player) override;
};
