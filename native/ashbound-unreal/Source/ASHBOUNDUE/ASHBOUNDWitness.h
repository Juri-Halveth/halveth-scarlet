#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "ASHBOUNDWitness.generated.h"

class UPointLightComponent;
class UStaticMeshComponent;

// A physical, interactable keeper at the valley entrance. Its stone body is
// part of the world; the small light identifies it without a floating UI box.
UCLASS()
class ASHBOUNDUE_API AASHBOUNDWitness : public AActor
{
    GENERATED_BODY()

public:
    AASHBOUNDWitness();
    virtual void Tick(float DeltaSeconds) override;
    bool CanSpeak(const FVector& Eye, const FVector& Forward) const;
    void Awaken();

protected:
    virtual void BeginPlay() override;

private:
    UPROPERTY()
    TObjectPtr<UStaticMeshComponent> Body;
    UPROPERTY()
    TObjectPtr<UStaticMeshComponent> Heart;
    UPROPERTY()
    TObjectPtr<UPointLightComponent> Light;
    float Time = 0.0f;
    bool bAwake = false;
};
