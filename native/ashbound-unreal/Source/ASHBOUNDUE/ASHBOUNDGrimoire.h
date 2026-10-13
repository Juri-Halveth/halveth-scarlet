#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "ASHBOUNDGrimoire.generated.h"

class UPointLightComponent;
class UCameraComponent;
class UMaterialInstanceDynamic;
class USceneComponent;
class UStaticMeshComponent;
class UTexture2D;

UCLASS()
class ASHBOUNDUE_API AASHBOUNDGrimoire : public AActor
{
    GENERATED_BODY()

public:
    AASHBOUNDGrimoire();
    virtual void Tick(float DeltaSeconds) override;
    void Study();
    void StopReading();
    bool IsStudied() const { return bStudied; }
    bool IsOpen() const { return bOpen; }

    UPROPERTY(EditAnywhere, Category="ASHBOUND")
    int32 VolumeIndex = 0;

    UPROPERTY(VisibleAnywhere, Category="ASHBOUND")
    TObjectPtr<UStaticMeshComponent> ClosedBook;

protected:
    virtual void BeginPlay() override;

private:
    void ShowPage();

    UPROPERTY()
    TObjectPtr<USceneComponent> BookRoot;
    UPROPERTY()
    TObjectPtr<UStaticMeshComponent> LeftCover;
    UPROPERTY()
    TObjectPtr<UStaticMeshComponent> RightCover;
    UPROPERTY()
    TObjectPtr<UStaticMeshComponent> Spine;
    UPROPERTY()
    TObjectPtr<UStaticMeshComponent> LeftStack;
    UPROPERTY()
    TObjectPtr<UStaticMeshComponent> RightStack;
    UPROPERTY()
    TObjectPtr<UStaticMeshComponent> LeftPage;
    UPROPERTY()
    TObjectPtr<UStaticMeshComponent> RightPage;
    UPROPERTY()
    TObjectPtr<USceneComponent> TurnPivot;
    UPROPERTY()
    TObjectPtr<UStaticMeshComponent> TurnSheet;
    UPROPERTY()
    TObjectPtr<UMaterialInstanceDynamic> LeftPageInk;
    UPROPERTY()
    TObjectPtr<UMaterialInstanceDynamic> RightPageInk;
    UPROPERTY()
    TObjectPtr<UMaterialInstanceDynamic> TurnPageInk;
    UPROPERTY()
    TObjectPtr<UPointLightComponent> ReadingLight;
    UPROPERTY()
    TObjectPtr<UCameraComponent> ReadingCamera;

    float OpenAmount = 0.0f;
    float TurnAmount = 0.0f;
    int32 Spread = 0;
    bool bOpen = false;
    bool bStudied = false;
    bool bTurning = false;
    bool bSwapped = false;
};
