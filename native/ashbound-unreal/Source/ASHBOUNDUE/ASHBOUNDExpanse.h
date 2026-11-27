#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "ASHBOUNDExpanse.generated.h"

class UHierarchicalInstancedStaticMeshComponent;
class UProceduralMeshComponent;
class UStaticMesh;
class UMaterialInterface;

// Extends the authored prologue eastward without preloading an enormous map.
// This is terrain and ecology infrastructure, not a completed open world.
UCLASS()
class ASHBOUNDUE_API AASHBOUNDExpanse : public AActor
{
    GENERATED_BODY()

public:
    AASHBOUNDExpanse();
    virtual void BeginPlay() override;
    virtual void Tick(float DeltaSeconds) override;

private:
    struct FTile
    {
        UProceduralMeshComponent* Ground = nullptr;
        UHierarchicalInstancedStaticMeshComponent* Rocks = nullptr;
        UHierarchicalInstancedStaticMeshComponent* Trees = nullptr;
        UHierarchicalInstancedStaticMeshComponent* Ferns = nullptr;
        UHierarchicalInstancedStaticMeshComponent* Grass = nullptr;
    };

    void Refresh(const FVector& PlayerPosition);
    void CreateTile(const FIntPoint& Key);
    void RemoveTile(const FIntPoint& Key);
    void RunGroundQa();
    float Height(float X, float Y) const;
    float LegacyEastHeight(float Y) const;
    UHierarchicalInstancedStaticMeshComponent* MakeFoliage(
        const FIntPoint& Key, const TCHAR* Kind, UStaticMesh* Mesh, bool bSolid);
    void PlaceFoliage(UHierarchicalInstancedStaticMeshComponent* Component,
        FRandomStream& Random, const FIntPoint& Key, int32 Count,
        float MinHeight, float MaxHeight, float RoadClearance);

    UPROPERTY()
    TObjectPtr<USceneComponent> ExpanseRoot;
    UPROPERTY()
    TObjectPtr<UMaterialInterface> GroundMaterial;
    UPROPERTY()
    TObjectPtr<UStaticMesh> RockMesh;
    UPROPERTY()
    TObjectPtr<UStaticMesh> TreeMesh;
    UPROPERTY()
    TObjectPtr<UStaticMesh> FernMesh;
    UPROPERTY()
    TObjectPtr<UStaticMesh> GrassMesh;

    TMap<FIntPoint, FTile> Tiles;
    float RefreshClock = 0.0f;
    bool bQaPending = false;
};
