#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "ASHBOUNDArchiveGate.generated.h"

class UStaticMeshComponent;

UCLASS()
class ASHBOUNDUE_API AASHBOUNDArchiveGate : public AActor
{
    GENERATED_BODY()

public:
    AASHBOUNDArchiveGate();
    virtual void Tick(float DeltaSeconds) override;
    void OpenGate();
    bool IsOpen() const { return bOpening; }

    UPROPERTY(VisibleAnywhere, Category="ASHBOUND")
    TObjectPtr<UStaticMeshComponent> DoorMesh;

private:
    FVector ClosedLocation = FVector::ZeroVector;
    float OpenProgress = 0.0f;
    bool bOpening = false;
};
