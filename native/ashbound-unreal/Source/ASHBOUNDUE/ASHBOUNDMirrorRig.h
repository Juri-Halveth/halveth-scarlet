#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "ASHBOUNDMirrorRig.generated.h"

class UPlanarReflectionComponent;
class USceneComponent;
class UStaticMeshComponent;

// One physical panel, one scene reflection. The apparent second view is not
// a duplicated world actor. This is a bounded, synthetic encounter for the
// native game, independent of the private source videos.
UCLASS()
class ASHBOUNDUE_API AASHBOUNDMirrorRig : public AActor
{
    GENERATED_BODY()

public:
    AASHBOUNDMirrorRig();
    virtual void Tick(float DeltaSeconds) override;

protected:
    virtual void BeginPlay() override;

private:
    UPROPERTY()
    TObjectPtr<USceneComponent> RigRoot;
    UPROPERTY()
    TObjectPtr<UStaticMeshComponent> Panel;
    UPROPERTY()
    TObjectPtr<UPlanarReflectionComponent> Reflection;

    float YawDegrees = 0.0f;
    int32 LastLoggedFiveDegreeStep = 0;
};
