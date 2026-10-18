#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "ASHBOUNDFairyButterfly.generated.h"

class UPointLightComponent;
class USceneComponent;
class UStaticMeshComponent;

// A small native 3D inhabitant: four flapping wings, a light and a bounded
// flight path. Planar reflection sees the same actor as the player camera.
UCLASS()
class ASHBOUNDUE_API AASHBOUNDFairyButterfly : public AActor
{
    GENERATED_BODY()

public:
    AASHBOUNDFairyButterfly();
    virtual void Tick(float DeltaSeconds) override;

protected:
    virtual void BeginPlay() override;

private:
    UPROPERTY()
    TObjectPtr<USceneComponent> FlightRoot;
    UPROPERTY()
    TObjectPtr<USceneComponent> LeftHinge;
    UPROPERTY()
    TObjectPtr<USceneComponent> RightHinge;
    UPROPERTY()
    TObjectPtr<UStaticMeshComponent> Body;
    UPROPERTY()
    TObjectPtr<UStaticMeshComponent> LeftUpperWing;
    UPROPERTY()
    TObjectPtr<UStaticMeshComponent> LeftLowerWing;
    UPROPERTY()
    TObjectPtr<UStaticMeshComponent> RightUpperWing;
    UPROPERTY()
    TObjectPtr<UStaticMeshComponent> RightLowerWing;
    UPROPERTY()
    TObjectPtr<UPointLightComponent> Glow;

    FVector Home;
    float FlightTime = 0.0f;
};
