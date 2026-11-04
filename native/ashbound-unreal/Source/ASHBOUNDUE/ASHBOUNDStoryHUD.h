#pragma once

#include "CoreMinimal.h"
#include "GameFramework/HUD.h"
#include "ASHBOUNDStoryHUD.generated.h"

class AASHBOUNDSpellManager;

// Sparse, resolution-aware text. The landscape, books and magic stay visible.
UCLASS()
class ASHBOUNDUE_API AASHBOUNDStoryHUD : public AHUD
{
    GENERATED_BODY()

public:
    virtual void DrawHUD() override;

private:
    TWeakObjectPtr<AASHBOUNDSpellManager> Story;
};
