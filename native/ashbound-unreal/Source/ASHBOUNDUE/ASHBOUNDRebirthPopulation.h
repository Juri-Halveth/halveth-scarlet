#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "ASHBOUNDRebirthPopulation.generated.h"

class UHierarchicalInstancedStaticMeshComponent;

// Populates only where a runtime collision trace finds the streamed landscape.
// An unstreamed or missing terrain produces no instances, never floating props.
UCLASS()
class ASHBOUNDUE_API AASHBOUNDRebirthPopulation : public AActor
{
    GENERATED_BODY()

public:
    AASHBOUNDRebirthPopulation();

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Rebirth")
    TObjectPtr<UHierarchicalInstancedStaticMeshComponent> Rocks;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Rebirth")
    TObjectPtr<UHierarchicalInstancedStaticMeshComponent> Ferns;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Rebirth")
    TObjectPtr<UHierarchicalInstancedStaticMeshComponent> Grasses;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Rebirth")
    TObjectPtr<UHierarchicalInstancedStaticMeshComponent> Stumps;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Rebirth")
    TObjectPtr<UHierarchicalInstancedStaticMeshComponent> Pines;

    // A species is a set of authored shapes, not one mesh rotated repeatedly.
    UPROPERTY(VisibleAnywhere, Category="Rebirth")
    TArray<TObjectPtr<UHierarchicalInstancedStaticMeshComponent>> FernVariants;
    UPROPERTY(VisibleAnywhere, Category="Rebirth")
    TArray<TObjectPtr<UHierarchicalInstancedStaticMeshComponent>> GrassVariants;
    UPROPERTY(VisibleAnywhere, Category="Rebirth")
    TArray<TObjectPtr<UHierarchicalInstancedStaticMeshComponent>> TreeVariants;
    UPROPERTY(VisibleAnywhere, Category="Rebirth")
    TArray<TObjectPtr<UHierarchicalInstancedStaticMeshComponent>> MossRockVariants;
    UPROPERTY(VisibleAnywhere, Category="Rebirth")
    TArray<TObjectPtr<UHierarchicalInstancedStaticMeshComponent>> FlowerVariants;

protected:
    virtual void BeginPlay() override;

private:
    int32 Scatter(const TArray<UHierarchicalInstancedStaticMeshComponent*>& Targets,
                  int32 Count, float RadiusCm, float HeightCm, float EmbedFraction,
                  float MinNormalZ, int32 Habitat, FRandomStream& Random);
};
