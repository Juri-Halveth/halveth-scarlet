#include "ASHBOUNDFairyButterfly.h"

#include "Components/PointLightComponent.h"
#include "Components/SceneComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/StaticMesh.h"
#include "Materials/MaterialInterface.h"
#include "UObject/ConstructorHelpers.h"

AASHBOUNDFairyButterfly::AASHBOUNDFairyButterfly()
{
    PrimaryActorTick.bCanEverTick = true;
    SetActorEnableCollision(false);
    FlightRoot = CreateDefaultSubobject<USceneComponent>(TEXT("FlightRoot"));
    RootComponent = FlightRoot;

    LeftHinge = CreateDefaultSubobject<USceneComponent>(TEXT("LeftHinge"));
    LeftHinge->SetupAttachment(FlightRoot);
    LeftHinge->SetRelativeLocation(FVector(0, -4, 0));
    RightHinge = CreateDefaultSubobject<USceneComponent>(TEXT("RightHinge"));
    RightHinge->SetupAttachment(FlightRoot);
    RightHinge->SetRelativeLocation(FVector(0, 4, 0));

    static ConstructorHelpers::FObjectFinder<UStaticMesh> Sphere(TEXT("/Engine/BasicShapes/Sphere.Sphere"));
    auto Shape = [](UStaticMeshComponent* Part, USceneComponent* Parent,
                           const FVector& Location, const FVector& Scale)
    {
        Part->SetupAttachment(Parent);
        Part->SetMobility(EComponentMobility::Movable);
        Part->SetCollisionEnabled(ECollisionEnabled::NoCollision);
        Part->SetCastShadow(false);
        if (Sphere.Succeeded()) Part->SetStaticMesh(Sphere.Object);
        Part->SetRelativeLocation(Location);
        Part->SetRelativeScale3D(Scale);
    };

    Body = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("LanternBody"));
    Shape(Body, FlightRoot, FVector::ZeroVector, FVector(0.09, 0.10, 0.26));
    LeftUpperWing = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("LeftUpperWing"));
    Shape(LeftUpperWing, LeftHinge, FVector(0, -17, 11), FVector(0.11, 0.34, 0.25));
    LeftLowerWing = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("LeftLowerWing"));
    Shape(LeftLowerWing, LeftHinge, FVector(0, -14, -8), FVector(0.10, 0.26, 0.17));
    RightUpperWing = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("RightUpperWing"));
    Shape(RightUpperWing, RightHinge, FVector(0, 17, 11), FVector(0.11, 0.34, 0.25));
    RightLowerWing = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("RightLowerWing"));
    Shape(RightLowerWing, RightHinge, FVector(0, 14, -8), FVector(0.10, 0.26, 0.17));

    Glow = CreateDefaultSubobject<UPointLightComponent>(TEXT("LivingGlow"));
    Glow->SetupAttachment(FlightRoot);
    Glow->SetIntensity(3800.0f);
    Glow->SetAttenuationRadius(230.0f);
    Glow->SetLightColor(FLinearColor(0.25f, 0.78f, 1.0f));
    Glow->SetCastShadows(false);
}

void AASHBOUNDFairyButterfly::BeginPlay()
{
    Super::BeginPlay();
    Home = GetActorLocation();
    const auto Apply = [](UStaticMeshComponent* Part, const TCHAR* Path)
    {
        if (UMaterialInterface* Material = LoadObject<UMaterialInterface>(nullptr, Path))
        {
            Part->SetMaterial(0, Material);
        }
        else
        {
            UE_LOG(LogTemp, Error, TEXT("ASHBOUND_BUTTERFLY_MATERIAL_MISSING %s"), Path);
        }
    };
    Apply(Body, TEXT("/Game/ASHBOUND/Materials/M_ButterflyBody.M_ButterflyBody"));
    Apply(LeftUpperWing, TEXT("/Game/ASHBOUND/Materials/M_ButterflyCyan.M_ButterflyCyan"));
    Apply(RightUpperWing, TEXT("/Game/ASHBOUND/Materials/M_ButterflyCyan.M_ButterflyCyan"));
    Apply(LeftLowerWing, TEXT("/Game/ASHBOUND/Materials/M_ButterflyViolet.M_ButterflyViolet"));
    Apply(RightLowerWing, TEXT("/Game/ASHBOUND/Materials/M_ButterflyViolet.M_ButterflyViolet"));
    UE_LOG(LogTemp, Display, TEXT("ASHBOUND_BUTTERFLY_READY home=%s"), *Home.ToString());
}

void AASHBOUNDFairyButterfly::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);
    FlightTime += DeltaSeconds;
    const float T = FlightTime;
    const FVector Offset(65.0f * FMath::Sin(T * 0.8f),
                         85.0f * FMath::Sin(T * 1.15f + 0.4f),
                         22.0f * FMath::Sin(T * 1.8f));
    SetActorLocation(Home + Offset);
    const float Flap = 24.0f + 44.0f * FMath::Sin(T * 17.0f);
    LeftHinge->SetRelativeRotation(FRotator(0.0f, 0.0f, Flap));
    RightHinge->SetRelativeRotation(FRotator(0.0f, 0.0f, -Flap));
    Glow->SetIntensity(3300.0f + 700.0f * FMath::Sin(T * 4.0f));
}
