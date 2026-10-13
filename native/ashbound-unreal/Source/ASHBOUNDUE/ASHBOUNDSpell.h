#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "ASHBOUNDSpell.generated.h"

class UMaterialInstanceDynamic;
class UMaterialInterface;
class UPointLightComponent;
class USceneComponent;
class UStaticMeshComponent;

UCLASS()
class ASHBOUNDUE_API AASHBOUNDSpell : public AActor
{
    GENERATED_BODY()

public:
    AASHBOUNDSpell();
    void Initialize(int32 InSchool, const FVector& InTarget, bool bInAmbient);
    virtual void Tick(float DeltaSeconds) override;

protected:
    virtual void BeginPlay() override;

private:
    void UpdateAppearance();

    UPROPERTY()
    TObjectPtr<USceneComponent> SpellRoot;

    UPROPERTY()
    TObjectPtr<UStaticMeshComponent> CoreMesh;

    UPROPERTY()
    TArray<TObjectPtr<UStaticMeshComponent>> Satellites;

    UPROPERTY()
    TObjectPtr<UPointLightComponent> Glow;

    UPROPERTY()
    TObjectPtr<UMaterialInterface> SpellMaterial;

    UPROPERTY()
    TObjectPtr<UMaterialInstanceDynamic> DynamicMaterial;

    FVector Origin = FVector::ZeroVector;
    FVector Target = FVector::ZeroVector;
    float Age = 0.0f;
    int32 School = 0;
    bool bAmbient = false;
};
