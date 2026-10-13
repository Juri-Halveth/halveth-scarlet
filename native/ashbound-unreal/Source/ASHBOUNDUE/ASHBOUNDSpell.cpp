#include "ASHBOUNDSpell.h"

#include "Components/PointLightComponent.h"
#include "Components/SceneComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "Materials/MaterialInterface.h"
#include "UObject/ConstructorHelpers.h"

namespace
{
FLinearColor SchoolColor(int32 School)
{
    switch (School)
    {
    case 1: return FLinearColor(1.0f, 0.26f, 0.055f);
    case 2: return FLinearColor(0.56f, 0.24f, 1.0f);
    default: return FLinearColor(0.035f, 0.86f, 1.0f);
    }
}
}

AASHBOUNDSpell::AASHBOUNDSpell()
{
    PrimaryActorTick.bCanEverTick = true;
    SetActorEnableCollision(false);

    SpellRoot = CreateDefaultSubobject<USceneComponent>(TEXT("SpellRoot"));
    RootComponent = SpellRoot;

    static ConstructorHelpers::FObjectFinder<UStaticMesh> Sphere(TEXT("/Engine/BasicShapes/Sphere.Sphere"));
    static ConstructorHelpers::FObjectFinder<UMaterialInterface> Material(
        TEXT("/Game/ASHBOUND/Materials/M_LivingSpell.M_LivingSpell"));
    SpellMaterial = Material.Object;

    CoreMesh = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("CoreMesh"));
    CoreMesh->SetupAttachment(SpellRoot);
    CoreMesh->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    CoreMesh->SetCastShadow(false);
    CoreMesh->SetRelativeScale3D(FVector(0.48f));
    if (Sphere.Succeeded()) CoreMesh->SetStaticMesh(Sphere.Object);

    for (int32 Index = 0; Index < 6; ++Index)
    {
        const FName Name(*FString::Printf(TEXT("Satellite_%02d"), Index));
        UStaticMeshComponent* Satellite = CreateDefaultSubobject<UStaticMeshComponent>(Name);
        Satellite->SetupAttachment(SpellRoot);
        Satellite->SetCollisionEnabled(ECollisionEnabled::NoCollision);
        Satellite->SetCastShadow(false);
        Satellite->SetRelativeScale3D(FVector(0.105f));
        if (Sphere.Succeeded()) Satellite->SetStaticMesh(Sphere.Object);
        Satellites.Add(Satellite);
    }

    Glow = CreateDefaultSubobject<UPointLightComponent>(TEXT("LivingGlow"));
    Glow->SetupAttachment(SpellRoot);
    Glow->SetIntensity(2300.0f);
    Glow->SetAttenuationRadius(650.0f);
    Glow->SetCastShadows(false);
}

void AASHBOUNDSpell::BeginPlay()
{
    Super::BeginPlay();
    Origin = GetActorLocation();
    if (SpellMaterial)
    {
        DynamicMaterial = UMaterialInstanceDynamic::Create(SpellMaterial, this);
        CoreMesh->SetMaterial(0, DynamicMaterial);
        for (UStaticMeshComponent* Satellite : Satellites)
        {
            Satellite->SetMaterial(0, DynamicMaterial);
        }
    }
    UpdateAppearance();
}

void AASHBOUNDSpell::Initialize(int32 InSchool, const FVector& InTarget, bool bInAmbient)
{
    School = FMath::Clamp(InSchool, 0, 2);
    Target = InTarget;
    Origin = GetActorLocation();
    bAmbient = bInAmbient;
    UpdateAppearance();
}

void AASHBOUNDSpell::UpdateAppearance()
{
    const FLinearColor Color = SchoolColor(School);
    Glow->SetLightColor(Color);
    if (DynamicMaterial)
    {
        DynamicMaterial->SetVectorParameterValue(TEXT("SpellColor"), Color);
        DynamicMaterial->SetScalarParameterValue(TEXT("Radiance"), 6.0f);
    }
}

void AASHBOUNDSpell::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);
    Age += DeltaSeconds;
    if (!bAmbient && Age >= 3.7f)
    {
        Destroy();
        return;
    }

    const float Phase = Age * (bAmbient ? 1.5f : 3.2f);
    FVector Center;
    if (bAmbient)
    {
        Center = Target + FVector(30.0f * FMath::Sin(Phase * 0.7f),
                                  30.0f * FMath::Cos(Phase * 0.7f),
                                  35.0f * FMath::Sin(Phase));
    }
    else
    {
        const float Progress = FMath::Clamp(Age / 2.6f, 0.0f, 1.0f);
        const float Ease = Progress * Progress * (3.0f - 2.0f * Progress);
        Center = FMath::Lerp(Origin, Target, Ease);
        Center.Z += 80.0f * FMath::Sin(PI * Progress);
    }
    SetActorLocation(Center, false);

    const float Breath = 1.0f + 0.15f * FMath::Sin(Phase * 2.0f);
    CoreMesh->SetRelativeScale3D(FVector(0.40f * Breath));
    const float Orbit = bAmbient ? 73.0f : 100.0f * (1.0f - FMath::Min(Age / 3.7f, 0.7f));
    for (int32 Index = 0; Index < Satellites.Num(); ++Index)
    {
        const float Angle = Phase * (School == 2 ? -2.0f : 2.0f) + Index * 2.0f * PI / Satellites.Num();
        Satellites[Index]->SetRelativeLocation(FVector(Orbit * FMath::Cos(Angle),
                                                       Orbit * FMath::Sin(Angle),
                                                       22.0f * FMath::Sin(Angle * 2.0f)));
    }
    Glow->SetIntensity((bAmbient ? 1600.0f : 3000.0f) * (0.85f + 0.15f * FMath::Sin(Phase * 2.0f)));
}
