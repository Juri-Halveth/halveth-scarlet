#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "ASHBOUNDSpellManager.generated.h"

UCLASS()
class ASHBOUNDUE_API AASHBOUNDSpellManager : public AActor
{
    GENERATED_BODY()

public:
    AASHBOUNDSpellManager();

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
    void StopReading();
};
