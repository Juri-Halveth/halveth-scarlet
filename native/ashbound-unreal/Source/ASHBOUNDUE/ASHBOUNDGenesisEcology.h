#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "ASHBOUNDGenesisEcology.generated.h"

class AASHBOUNDRebirthPopulation;

// Two bounded, deterministic habitat windows over the authored 5 km landscape.
// Small plants use 50 m cells; canopy and rock use coarse 200 m cells.
UCLASS()
class ASHBOUNDUE_API AASHBOUNDGenesisEcology : public AActor
{
    GENERATED_BODY()

public:
    AASHBOUNDGenesisEcology();

protected:
    virtual void BeginPlay() override;
    virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
    static constexpr int32 NearCellWidthCm = 5000;
    static constexpr int32 MacroCellWidthCm = 20000;
    TMap<FIntPoint, TWeakObjectPtr<AASHBOUNDRebirthPopulation>> NearCells;
    TMap<FIntPoint, TWeakObjectPtr<AASHBOUNDRebirthPopulation>> MacroCells;
    FTimerHandle RefreshTimer;
    double LastMetricsAt = 0.0;
    uint64 LastMetricsFrame = 0;
    void RefreshCells();
};
