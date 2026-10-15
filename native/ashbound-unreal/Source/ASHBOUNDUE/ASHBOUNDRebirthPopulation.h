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

protected:
    virtual void BeginPlay() override;

private:
    int32 Scatter(UHierarchicalInstancedStaticMeshComponent* Target, int32 Count,
                  float RadiusCm, float HeightCm, float EmbedFraction,
                  float MinNormalZ, FRandomStream& Random);
};
