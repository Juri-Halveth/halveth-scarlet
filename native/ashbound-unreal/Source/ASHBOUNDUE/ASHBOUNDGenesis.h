#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "ASHBOUNDGenesis.generated.h"

class AASHBOUNDSpell;
class AASHBOUNDGrove;
class UMaterialInstanceDynamic;
class UPointLightComponent;
class USceneComponent;
class UStaticMeshComponent;

// The first playable creation event: a grounded source emits a short pulse
// and temporary soil traces; the previous pulse fades on reactivation.
UCLASS()
class ASHBOUNDUE_API AASHBOUNDGenesis : public AActor
{
    GENERATED_BODY()

public:
    AASHBOUNDGenesis();
    virtual void Tick(float DeltaSeconds) override;
    void Birth();

protected:
    virtual void BeginPlay() override;

private:
    UPROPERTY()
    TObjectPtr<USceneComponent> OriginRoot;
    UPROPERTY()
    TObjectPtr<UStaticMeshComponent> Core;
    UPROPERTY()
    TArray<TObjectPtr<UStaticMeshComponent>> Fragments;
    UPROPERTY()
    TObjectPtr<UPointLightComponent> Glow;
    UPROPERTY()
    TObjectPtr<UMaterialInstanceDynamic> CoreMaterial;
    UPROPERTY()
    TArray<TObjectPtr<AASHBOUNDSpell>> BornWisps;
    UPROPERTY()
    TArray<TObjectPtr<AASHBOUNDGrove>> BornGroves;

    float Time = 0.0f;
    float PulseAge = 100.0f;
    int32 Generation = 0;
};
