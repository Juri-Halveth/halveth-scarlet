#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "ASHBOUNDGrimoire.generated.h"

class UPointLightComponent;
class UCameraComponent;
class USceneComponent;
class UStaticMeshComponent;
class UTextRenderComponent;

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
    TObjectPtr<UStaticMeshComponent> LeftPage;
    UPROPERTY()
    TObjectPtr<UStaticMeshComponent> RightPage;
    UPROPERTY()
    TObjectPtr<UTextRenderComponent> LeftText;
    UPROPERTY()
    TObjectPtr<UTextRenderComponent> RightText;
    UPROPERTY()
    TObjectPtr<UPointLightComponent> ReadingLight;
    UPROPERTY()
    TObjectPtr<UCameraComponent> ReadingCamera;

    float OpenAmount = 0.0f;
    int32 Page = 0;
    bool bOpen = false;
    bool bStudied = false;
};
