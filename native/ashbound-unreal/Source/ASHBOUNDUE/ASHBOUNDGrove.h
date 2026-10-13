#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "ASHBOUNDGrove.generated.h"

class UHierarchicalInstancedStaticMeshComponent;
class UMaterialInstanceDynamic;
class USceneComponent;
class UStaticMesh;

// One Reweave cast grows a small grove through a single instanced mesh draw path.
UCLASS()
class ASHBOUNDUE_API AASHBOUNDGrove : public AActor
{
    GENERATED_BODY()

public:
    AASHBOUNDGrove();
    void Initialize(UStaticMesh* FernMesh);
    virtual void Tick(float DeltaSeconds) override;

private:
    UPROPERTY()
    TObjectPtr<USceneComponent> GroveRoot;

    UPROPERTY()
    TObjectPtr<UHierarchicalInstancedStaticMeshComponent> Fronds;

    UPROPERTY()
    TObjectPtr<UMaterialInstanceDynamic> VerdantMaterial;

    TArray<FTransform> MatureTransforms;
    float GrowthAge = 0.0f;
};
