#pragma once

#include "CoreMinimal.h"
#include "ASHBOUNDSoil.h"
#include "GameFramework/Actor.h"
#include "ASHBOUNDGenesisEcology.generated.h"

class AASHBOUNDRebirthPopulation;

// Three bounded, deterministic habitat windows over the authored 5 km landscape.
// Fine ground cover uses 10 m cells, vegetation 50 m, canopy/rock 200 m.
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
    static constexpr int32 DetailCellWidthCm = 1000;
    TMap<FIntPoint, TWeakObjectPtr<AASHBOUNDRebirthPopulation>> DetailCells;
    TMap<FIntPoint, TWeakObjectPtr<AASHBOUNDRebirthPopulation>> NearCells;
    TMap<FIntPoint, TWeakObjectPtr<AASHBOUNDRebirthPopulation>> MacroCells;
    FTimerHandle RefreshTimer;
    double LastMetricsAt = 0.0;
    uint64 LastMetricsFrame = 0;
    int32 Year = 1;
    int32 DayOfYear = 172;
    float Hour = 12.0f;
    float LastClockTime = 0.0f;
    float LastSunUpdate = -100.0f;
    float LastSoilSample = -100.0f;
    bool bGroundProfileValid = false;
    FASHBOUNDSoilProfile GroundProfile;
    void RefreshCells();
};
