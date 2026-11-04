#include "ASHBOUNDWitness.h"

#include "Components/PointLightComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/StaticMesh.h"
#include "Materials/MaterialInterface.h"
#include "UObject/ConstructorHelpers.h"

AASHBOUNDWitness::AASHBOUNDWitness()
{
    PrimaryActorTick.bCanEverTick = true;
    Body = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("StoneKeeper"));
    RootComponent = Body;
    Body->SetCollisionProfileName(TEXT("BlockAll"));
    Body->SetRelativeScale3D(FVector(1.8f));
    // This CC0 statue is already used by the valley and is therefore cooked.
    static ConstructorHelpers::FObjectFinderOptional<UStaticMesh> Statue(
        TEXT("/Game/ASHBOUND/Models/gothic_statue/gothic_statue_1k/StaticMeshes/gothic_statue_1k.gothic_statue_1k"),
        LOAD_NoWarn);
    if (Statue.Get()) Body->SetStaticMesh(Statue.Get());

    Heart = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("KeeperHeart"));
    Heart->SetupAttachment(Body);
    Heart->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    Heart->SetCastShadow(false);
    Heart->SetRelativeLocation(FVector(0, 0, 105));
    Heart->SetRelativeScale3D(FVector(0.052f));
    static ConstructorHelpers::FObjectFinder<UStaticMesh> Sphere(TEXT("/Engine/BasicShapes/Sphere.Sphere"));
    if (Sphere.Succeeded()) Heart->SetStaticMesh(Sphere.Object);

    Light = CreateDefaultSubobject<UPointLightComponent>(TEXT("KeeperLight"));
    Light->SetupAttachment(Body);
    Light->SetRelativeLocation(FVector(0, 0, 130));
    Light->SetIntensity(420.0f);
    Light->SetAttenuationRadius(420.0f);
    Light->SetCastShadows(false);
    Light->SetLightColor(FLinearColor(0.18f, 0.75f, 1.0f));
}

void AASHBOUNDWitness::BeginPlay()
{
    Super::BeginPlay();
    UMaterialInterface* Glow = LoadObject<UMaterialInterface>(nullptr,
        TEXT("/Game/ASHBOUND/Materials/M_LivingSpellSoft.M_LivingSpellSoft"));
    if (Glow) Heart->SetMaterial(0, Glow);
    UE_LOG(LogTemp, Display, TEXT("ASHBOUND_STORY witness ready at %s body=%d"),
        *GetActorLocation().ToString(), Body->GetStaticMesh() ? 1 : 0);
}

bool AASHBOUNDWitness::CanSpeak(const FVector& Eye, const FVector& Forward) const
{
    const FVector ToKeeper = GetActorLocation() + FVector(0, 0, 145) - Eye;
    return ToKeeper.SizeSquared() < FMath::Square(390.0f) &&
        FVector::DotProduct(ToKeeper.GetSafeNormal(), Forward) > 0.36f;
}

void AASHBOUNDWitness::Awaken()
{
    bAwake = true;
    UE_LOG(LogTemp, Display, TEXT("ASHBOUND_STORY witness awakened"));
}

void AASHBOUNDWitness::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);
    Time += DeltaSeconds;
    const float Breath = 0.84f + 0.16f * FMath::Sin(Time * (bAwake ? 3.0f : 1.2f));
    Light->SetIntensity((bAwake ? 1500.0f : 420.0f) * Breath);
    Heart->SetRelativeScale3D(FVector((bAwake ? 0.072f : 0.052f) * Breath));
}
