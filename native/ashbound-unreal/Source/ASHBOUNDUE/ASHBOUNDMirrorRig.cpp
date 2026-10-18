#include "ASHBOUNDMirrorRig.h"

#include "Components/PlanarReflectionComponent.h"
#include "Components/SceneComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/StaticMesh.h"
#include "Engine/GameViewportClient.h"
#include "GameFramework/PlayerController.h"
#include "InputCoreTypes.h"
#include "Materials/MaterialInterface.h"
#include "Misc/CommandLine.h"
#include "Misc/Paths.h"
#include "Misc/Parse.h"
#include "UnrealClient.h"
#include "UObject/ConstructorHelpers.h"
#include "TimerManager.h"

AASHBOUNDMirrorRig::AASHBOUNDMirrorRig()
{
    PrimaryActorTick.bCanEverTick = true;
    RigRoot = CreateDefaultSubobject<USceneComponent>(TEXT("MirrorPivot"));
    RootComponent = RigRoot;

    Panel = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("ReflectivePanel"));
    Panel->SetupAttachment(RigRoot);
    static ConstructorHelpers::FObjectFinder<UStaticMesh> Cube(TEXT("/Engine/BasicShapes/Cube.Cube"));
    if (Cube.Succeeded()) Panel->SetStaticMesh(Cube.Object);
    Panel->SetRelativeScale3D(FVector(0.12f, 4.0f, 2.6f));
    Panel->SetCollisionEnabled(ECollisionEnabled::QueryAndPhysics);

    Reflection = CreateDefaultSubobject<UPlanarReflectionComponent>(TEXT("MirrorReflection"));
    Reflection->SetupAttachment(RigRoot);
    // The panel's front is local -X. Planar reflection's normal is local +Z.
    Reflection->SetRelativeLocation(FVector(-6.1f, 0.0f, 0.0f));
    Reflection->SetRelativeRotation(FRotator(90.0f, 0.0f, 0.0f));
    Reflection->ScreenPercentage = 50;
    Reflection->NormalDistortionStrength = 0.0f;
    Reflection->PrefilterRoughness = 0.0f;
    Reflection->bShowPreviewPlane = false;
}

void AASHBOUNDMirrorRig::BeginPlay()
{
    Super::BeginPlay();
    if (UMaterialInterface* Surface = LoadObject<UMaterialInterface>(
            nullptr, TEXT("/Game/ASHBOUND/Materials/M_MirrorEncounter.M_MirrorEncounter")))
    {
        Panel->SetMaterial(0, Surface);
    }
    else
    {
        UE_LOG(LogTemp, Error, TEXT("ASHBOUND_MIRROR_MATERIAL_MISSING"));
    }
    UE_LOG(LogTemp, Display, TEXT("ASHBOUND_MIRROR_READY position=%s normal=%s"),
        *GetActorLocation().ToString(), *Reflection->GetUpVector().ToString());

#if !UE_BUILD_SHIPPING
    if (FParse::Param(FCommandLine::Get(), TEXT("ashboundmirrorqa")))
    {
        FTimerHandle FirstShot;
        GetWorldTimerManager().SetTimer(FirstShot, FTimerDelegate::CreateWeakLambda(this, [this]()
        {
            FScreenshotRequest::RequestScreenshot(
                FPaths::ProjectSavedDir() / TEXT("Screenshots/Mirror-0.png"), false, false);
            UE_LOG(LogTemp, Display, TEXT("ASHBOUND_MIRROR_QA shot=0"));
        }), 12.0f, false);

        FTimerHandle Rotate;
        GetWorldTimerManager().SetTimer(Rotate, FTimerDelegate::CreateWeakLambda(this, [this]()
        {
            YawDegrees = 30.0f;
            SetActorRotation(FRotator(0.0f, YawDegrees, 0.0f));
            UE_LOG(LogTemp, Display, TEXT("ASHBOUND_MIRROR_QA yaw=30 normal=%s"),
                *Reflection->GetUpVector().ToString());
        }), 14.0f, false);

        FTimerHandle SecondShot;
        GetWorldTimerManager().SetTimer(SecondShot, FTimerDelegate::CreateWeakLambda(this, [this]()
        {
            FScreenshotRequest::RequestScreenshot(
                FPaths::ProjectSavedDir() / TEXT("Screenshots/Mirror-30.png"), false, false);
            UE_LOG(LogTemp, Display, TEXT("ASHBOUND_MIRROR_QA shot=30"));
        }), 21.0f, false);
    }
#endif
}

void AASHBOUNDMirrorRig::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);
    const APlayerController* PC = GetWorld() ? GetWorld()->GetFirstPlayerController() : nullptr;
    if (!PC) return;

    const float Axis = (PC->IsInputKeyDown(EKeys::E) ? 1.0f : 0.0f)
                     - (PC->IsInputKeyDown(EKeys::Q) ? 1.0f : 0.0f);
    if (Axis == 0.0f) return;

    YawDegrees = FMath::Clamp(YawDegrees + Axis * 35.0f * DeltaSeconds, -45.0f, 45.0f);
    SetActorRotation(FRotator(0.0f, YawDegrees, 0.0f));
    const int32 FiveDegreeStep = FMath::RoundToInt(YawDegrees / 5.0f);
    if (FiveDegreeStep != LastLoggedFiveDegreeStep)
    {
        LastLoggedFiveDegreeStep = FiveDegreeStep;
        UE_LOG(LogTemp, Display, TEXT("ASHBOUND_MIRROR_ANGLE yaw=%.1f normal=%s"),
            YawDegrees, *Reflection->GetUpVector().ToString());
    }
}
