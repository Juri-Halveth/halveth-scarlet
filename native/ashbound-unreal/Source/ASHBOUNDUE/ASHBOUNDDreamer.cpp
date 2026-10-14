#include "ASHBOUNDDreamer.h"

#include "Components/PointLightComponent.h"
#include "Components/SceneComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/StaticMesh.h"
#include "Materials/MaterialInterface.h"
#include "UObject/ConstructorHelpers.h"

AASHBOUNDDreamer::AASHBOUNDDreamer()
{
    PrimaryActorTick.bCanEverTick = true;
    DreamerRoot = CreateDefaultSubobject<USceneComponent>(TEXT("DreamerRoot"));
    RootComponent = DreamerRoot;
    Bed = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("StoneBed"));
    Bed->SetupAttachment(DreamerRoot);
    Bed->SetRelativeLocation(FVector(0, 0, 17));
    Bed->SetCollisionProfileName(TEXT("BlockAll"));
    Bed->SetRelativeScale3D(FVector(1.45f, 2.45f, 0.30f));
    static ConstructorHelpers::FObjectFinder<UStaticMesh> Cube(TEXT("/Engine/BasicShapes/Cube.Cube"));
    if (Cube.Succeeded()) Bed->SetStaticMesh(Cube.Object);

    Body = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("SleepingKeeper"));
    Body->SetupAttachment(DreamerRoot);
    Body->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    Body->SetRelativeLocation(FVector(0, 0, 70));
    Body->SetRelativeRotation(FRotator(90, 0, 0));
    Body->SetRelativeScale3D(FVector(1.45f));
    // Reuse the existing CC0 scan; no third-party franchise asset enters the build.
    static ConstructorHelpers::FObjectFinderOptional<UStaticMesh> Statue(
        TEXT("/Game/ASHBOUND/Models/gothic_statue/gothic_statue_1k/StaticMeshes/gothic_statue_1k.gothic_statue_1k"),
        LOAD_NoWarn);
    if (Statue.Get()) Body->SetStaticMesh(Statue.Get());

    Heart = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("DreamerHeart"));
    Heart->SetupAttachment(DreamerRoot);
    Heart->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    Heart->SetCastShadow(false);
    Heart->SetRelativeLocation(FVector(0, 0, 89));
    Heart->SetRelativeScale3D(FVector(0.055f));
    static ConstructorHelpers::FObjectFinder<UStaticMesh> Sphere(TEXT("/Engine/BasicShapes/Sphere.Sphere"));
    if (Sphere.Succeeded()) Heart->SetStaticMesh(Sphere.Object);

    HeartLight = CreateDefaultSubobject<UPointLightComponent>(TEXT("DreamerLight"));
    HeartLight->SetupAttachment(DreamerRoot);
    HeartLight->SetRelativeLocation(FVector(0, 0, 90));
    HeartLight->SetAttenuationRadius(360.0f);
    HeartLight->SetCastShadows(false);
    HeartLight->SetLightColor(FLinearColor(0.52f, 0.72f, 1.0f));
}

void AASHBOUNDDreamer::BeginPlay()
{
    Super::BeginPlay();
    UMaterialInterface* Glow = LoadObject<UMaterialInterface>(nullptr,
        TEXT("/Game/ASHBOUND/Materials/M_LivingSpellSoft.M_LivingSpellSoft"));
    if (Glow) Heart->SetMaterial(0, Glow);
    UMaterialInterface* Stone = LoadObject<UMaterialInterface>(nullptr,
        TEXT("/Game/ASHBOUND/Materials/M_AshStone.M_AshStone"));
    if (Stone) Bed->SetMaterial(0, Stone);
    UE_LOG(LogTemp, Display, TEXT("ASHBOUND_DREAMER grounded at %s body=%d"),
        *GetActorLocation().ToString(), Body->GetStaticMesh() ? 1 : 0);
}

bool AASHBOUNDDreamer::CanDecide(const FVector& Eye, const FVector& Forward) const
{
    const FVector ToHeart = GetActorLocation() + FVector(0, 0, 90) - Eye;
    return ToHeart.SizeSquared() < FMath::Square(370.0f) &&
        FVector::DotProduct(ToHeart.GetSafeNormal(), Forward) > 0.32f;
}

void AASHBOUNDDreamer::SetDecision(int32 NewDecision)
{
    Decision = NewDecision;
    // The choice is physically legible even after loading a saved game.
    Heart->SetVisibility(Decision != 1);
    HeartLight->SetVisibility(Decision != 1);
    if (Decision == 2)
        HeartLight->SetLightColor(FLinearColor(0.35f, 1.0f, 0.72f));
    UE_LOG(LogTemp, Display, TEXT("ASHBOUND_DREAMER decision=%d light=%d"),
        Decision, Decision == 1 ? 0 : 1);
}

void AASHBOUNDDreamer::LearnFromBooks(int32 StudiedVolumes)
{
    if (Decision != 2 || StudiedVolumes <= RememberedVolumes) return;
    RememberedVolumes = FMath::Clamp(StudiedVolumes, 0, 3);
    // Her role changes from witness to living archive when all three memories
    // return. The visual state is derived from saved book facts on every load.
    if (RememberedVolumes == 3)
        HeartLight->SetLightColor(FLinearColor(0.65f, 0.34f, 1.0f));
    UE_LOG(LogTemp, Display, TEXT("ASHBOUND_DREAMER memory=%d role=%s"),
        RememberedVolumes, RememberedVolumes == 3 ? TEXT("LIVING_ARCHIVE") : TEXT("WAKING_WITNESS"));
}

void AASHBOUNDDreamer::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);
    Time += DeltaSeconds;
    if (Decision == 1) return;
    const float Breath = 0.78f + 0.22f * FMath::Sin(Time * (Decision == 2 ? 2.3f : 1.0f));
    HeartLight->SetIntensity((RememberedVolumes == 3 ? 1900.0f :
                              Decision == 2 ? 1250.0f : 470.0f) * Breath);
    Heart->SetRelativeScale3D(FVector((Decision == 2 ? 0.075f : 0.055f) * Breath));
}
