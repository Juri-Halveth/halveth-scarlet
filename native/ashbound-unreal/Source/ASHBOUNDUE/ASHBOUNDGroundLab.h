#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "ASHBOUNDGroundLab.generated.h"

class UHierarchicalInstancedStaticMeshComponent;
class UBoxComponent;
class UProceduralMeshComponent;
class USceneComponent;
class UStaticMesh;
class UMaterialInterface;

// Independent 5 x 5 km ground experiment. Chunks stream around the player;
// the geometry is extracted from 3D solid density rather than a height sheet.
UCLASS()
class ASHBOUNDUE_API AASHBOUNDGroundLab : public AActor
{
    GENERATED_BODY()

public:
    AASHBOUNDGroundLab();
    virtual void BeginPlay() override;
    virtual void Tick(float DeltaSeconds) override;

private:
    struct FDig
    {
        FVector Centre;
        float Radius = 0.0f;
    };
    struct FTile
    {
        UProceduralMeshComponent* Ground = nullptr;
        UHierarchicalInstancedStaticMeshComponent* Trees = nullptr;
        UHierarchicalInstancedStaticMeshComponent* Grass = nullptr;
        UHierarchicalInstancedStaticMeshComponent* Ferns = nullptr;
        UHierarchicalInstancedStaticMeshComponent* Rocks = nullptr;
    };

    float Height(float X, float Y) const;
    float Density(const FVector& P) const;
    int32 TileIndex(float Coordinate) const;
    void Refresh(const FVector& Position);
    void CreateTile(const FIntPoint& Key);
    void RemoveTile(const FIntPoint& Key);
    void DigAt(const FVector& Position, float Radius);
    void DigInFront();
    void RunQa();

    UPROPERTY()
    TObjectPtr<USceneComponent> GroundRoot;
    UPROPERTY()
    TObjectPtr<UMaterialInterface> SoilMaterial;
    UPROPERTY()
    TObjectPtr<UMaterialInterface> RockMaterial;
    UPROPERTY()
    TObjectPtr<UStaticMesh> TreeMesh;
    UPROPERTY()
    TObjectPtr<UStaticMesh> GrassMesh;
    UPROPERTY()
    TObjectPtr<UStaticMesh> FernMesh;
    UPROPERTY()
    TObjectPtr<UStaticMesh> RockMesh;
    UPROPERTY()
    TArray<TObjectPtr<UBoxComponent>> WorldBounds;

    TMap<FIntPoint, FTile> Tiles;
    TArray<FDig> Digs;
    float RefreshClock = 0.0f;
};
