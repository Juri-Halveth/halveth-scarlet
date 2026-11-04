#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "ASHBOUNDFungalHome.generated.h"

class USceneComponent;
class UStaticMeshComponent;
class UPointLightComponent;

// A small, reversible living shelter. Its shape follows care and proximity,
// never a hidden judgement about the player.
UCLASS()
class ASHBOUNDUE_API AASHBOUNDFungalHome : public AActor
{
    GENERATED_BODY()

public:
    AASHBOUNDFungalHome();
    virtual void Tick(float DeltaSeconds) override;
    void Nurture();
    float GetVitality() const { return Vitality; }

protected:
    virtual void BeginPlay() override;

private:
    UPROPERTY()
    TObjectPtr<USceneComponent> HomeRoot;
    UPROPERTY()
    TObjectPtr<UStaticMeshComponent> Crown;
    UPROPERTY()
    TArray<TObjectPtr<UStaticMeshComponent>> Ribs;
    UPROPERTY()
    TArray<TObjectPtr<UStaticMeshComponent>> Rim;
    UPROPERTY()
    TObjectPtr<UPointLightComponent> HeartLight;

    float Vitality = 0.72f;
    float ShownVitality = 0.72f;
    float Time = 0.0f;
    float SampleAge = 0.0f;
    bool bOccupied = false;
};
