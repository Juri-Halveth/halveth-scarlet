#pragma once

#include "CoreMinimal.h"
#include "ASHBOUNDSoil.h"
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
    int32 GetYear() const { return Year; }
    int32 GetDayOfYear() const { return DayOfYear; }
    float GetHour() const { return Hour; }
    bool HasGroundProfile() const { return bGroundProfileValid; }
    const FASHBOUNDSoilProfile& GetGroundProfile() const { return GroundProfile; }

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
    int32 Year = 1;
    int32 DayOfYear = 172;
    float Hour = 9.0f;
    float LastClockTime = 0.0f;
    float LastSunUpdate = -100.0f;
    float LastSoilSample = -100.0f;
    bool bGroundProfileValid = false;
    FASHBOUNDSoilProfile GroundProfile;
    void RefreshCells();
};
