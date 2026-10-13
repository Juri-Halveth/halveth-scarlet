#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "ASHBOUNDSeal.generated.h"

class UMaterialInstanceDynamic;
class UPointLightComponent;
class USceneComponent;
class UStaticMeshComponent;

UCLASS()
class ASHBOUNDUE_API AASHBOUNDSeal : public AActor
{
    GENERATED_BODY()

public:
    AASHBOUNDSeal();
    virtual void Tick(float DeltaSeconds) override;
    bool Activate(int32 SpellSchool);
    bool IsActive() const { return bActive; }
    int32 GetRequiredSchool() const { return RequiredSchool; }

    UPROPERTY(EditAnywhere, Category="ASHBOUND")
    int32 RequiredSchool = 0;

protected:
    virtual void BeginPlay() override;

private:
    UPROPERTY()
    TObjectPtr<USceneComponent> SealRoot;
    UPROPERTY()
    TObjectPtr<UStaticMeshComponent> SealCore;
    UPROPERTY()
    TObjectPtr<UPointLightComponent> Glow;
    UPROPERTY()
    TObjectPtr<UMaterialInstanceDynamic> DynamicMaterial;

    float Time = 0.0f;
    bool bActive = false;
};
