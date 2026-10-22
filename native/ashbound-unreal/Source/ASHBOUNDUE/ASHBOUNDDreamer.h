#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "ASHBOUNDDreamer.generated.h"

class UPointLightComponent;
class USceneComponent;
class UStaticMeshComponent;

// The sleeper is a grounded story actor. Her light is tied to her body and
// changes with the saved decision; she is never a free-floating world effect.
UCLASS()
class ASHBOUNDUE_API AASHBOUNDDreamer : public AActor
{
    GENERATED_BODY()

public:
    AASHBOUNDDreamer();
    virtual void Tick(float DeltaSeconds) override;
    bool CanDecide(const FVector& Eye, const FVector& Forward) const;
    void SetDecision(int32 NewDecision);
    void LearnFromBooks(int32 StudiedVolumes);
    int32 GetRememberedVolumes() const { return RememberedVolumes; }

protected:
    virtual void BeginPlay() override;

private:
    UPROPERTY()
    TObjectPtr<USceneComponent> DreamerRoot;
    UPROPERTY()
    TObjectPtr<UStaticMeshComponent> Bed;
    UPROPERTY()
    TObjectPtr<UStaticMeshComponent> Body;
    UPROPERTY()
    TObjectPtr<UStaticMeshComponent> Heart;
    UPROPERTY()
    TObjectPtr<UPointLightComponent> HeartLight;
    int32 Decision = 0;
    int32 RememberedVolumes = 0;
    float Time = 0.0f;
};
