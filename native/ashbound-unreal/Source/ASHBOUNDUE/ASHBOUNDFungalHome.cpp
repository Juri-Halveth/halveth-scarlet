#include "ASHBOUNDFungalHome.h"

#include "Components/PointLightComponent.h"
#include "Components/SceneComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/StaticMesh.h"
#include "GameFramework/Pawn.h"
#include "Kismet/GameplayStatics.h"
#include "Materials/MaterialInterface.h"
#include "UObject/ConstructorHelpers.h"

AASHBOUNDFungalHome::AASHBOUNDFungalHome()
{
    PrimaryActorTick.bCanEverTick = true;
    PrimaryActorTick.TickInterval = 0.05f;
    SetActorEnableCollision(false);
    HomeRoot = CreateDefaultSubobject<USceneComponent>(TEXT("FungalRoot"));
    RootComponent = HomeRoot;
    static ConstructorHelpers::FObjectFinder<UStaticMesh> Sphere(TEXT("/Engine/BasicShapes/Sphere.Sphere"));

    Crown = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("LivingCrown"));
    Crown->SetupAttachment(HomeRoot);
    Crown->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    if (Sphere.Succeeded()) Crown->SetStaticMesh(Sphere.Object);

    for (int32 Index = 0; Index < 8; ++Index)
    {
        UStaticMeshComponent* Rib = CreateDefaultSubobject<UStaticMeshComponent>(
            FName(*FString::Printf(TEXT("RootRib_%02d"), Index)));
        Rib->SetupAttachment(HomeRoot);
        Rib->SetCollisionEnabled(ECollisionEnabled::NoCollision);
        if (Sphere.Succeeded()) Rib->SetStaticMesh(Sphere.Object);
        Ribs.Add(Rib);

        UStaticMeshComponent* Lobe = CreateDefaultSubobject<UStaticMeshComponent>(
            FName(*FString::Printf(TEXT("CapLobe_%02d"), Index)));
        Lobe->SetupAttachment(HomeRoot);
        Lobe->SetCollisionEnabled(ECollisionEnabled::NoCollision);
        if (Sphere.Succeeded()) Lobe->SetStaticMesh(Sphere.Object);
        Rim.Add(Lobe);
    }

    HeartLight = CreateDefaultSubobject<UPointLightComponent>(TEXT("FungalHeart"));
    HeartLight->SetupAttachment(HomeRoot);
    HeartLight->SetRelativeLocation(FVector(0, 0, 235));
    HeartLight->SetAttenuationRadius(520.0f);
    HeartLight->SetCastShadows(false);
    HeartLight->SetLightColor(FLinearColor(0.38f, 0.85f, 0.58f));
}

void AASHBOUNDFungalHome::BeginPlay()
{
    Super::BeginPlay();
    UMaterialInterface* Bark = LoadObject<UMaterialInterface>(nullptr,
        TEXT("/Game/ASHBOUND/Surfaces/M_AshStone.M_AshStone"));
    UMaterialInterface* Cap = LoadObject<UMaterialInterface>(nullptr,
        TEXT("/Game/ASHBOUND/Materials/M_GroveFern.M_GroveFern"));
    if (Bark)
        for (UStaticMeshComponent* Rib : Ribs) Rib->SetMaterial(0, Bark);
    if (Cap)
    {
        Crown->SetMaterial(0, Cap);
        for (UStaticMeshComponent* Lobe : Rim) Lobe->SetMaterial(0, Cap);
    }
    UE_LOG(LogTemp, Display, TEXT("ASHBOUND_FUNGAL_HOME rooted at=%s vitality=%.2f"),
        *GetActorLocation().ToString(), Vitality);
}

void AASHBOUNDFungalHome::Nurture()
{
    Vitality = FMath::Clamp(Vitality + 0.28f, 0.0f, 1.0f);
    UE_LOG(LogTemp, Display, TEXT("ASHBOUND_FUNGAL_HOME nurtured vitality=%.2f"), Vitality);
}

void AASHBOUNDFungalHome::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);
    Time += DeltaSeconds;
    // Proximity is an in-game occupancy proxy, not a CO2 or mind reading claim.
    SampleAge += DeltaSeconds;
    if (SampleAge >= 0.25f)
    {
        SampleAge = 0.0f;
        const APawn* Player = UGameplayStatics::GetPlayerPawn(this, 0);
        const bool bNowOccupied = Player &&
            FVector::DistSquared2D(Player->GetActorLocation(), GetActorLocation()) < FMath::Square(230.0f);
        if (bNowOccupied != bOccupied)
        {
            bOccupied = bNowOccupied;
            UE_LOG(LogTemp, Display, TEXT("ASHBOUND_FUNGAL_HOME occupied=%d"), bOccupied ? 1 : 0);
        }
    }

    Vitality = FMath::Max(0.30f, Vitality - DeltaSeconds * 0.0015f);
    ShownVitality = FMath::FInterpTo(ShownVitality, Vitality, DeltaSeconds, 1.4f);
    const float Radius = 145.0f + 85.0f * ShownVitality;
    const float Height = 230.0f + 55.0f * ShownVitality;
    Crown->SetRelativeLocation(FVector(0, 0, Height + 34.0f));
    Crown->SetRelativeScale3D(FVector(Radius / 52.0f, Radius / 52.0f, 0.46f));
    for (int32 Index = 0; Index < Ribs.Num(); ++Index)
    {
        const float Angle = 2.0f * PI * Index / Ribs.Num();
        const FVector Direction(FMath::Cos(Angle), FMath::Sin(Angle), 0);
        Ribs[Index]->SetRelativeLocation(Direction * Radius + FVector(0, 0, Height * 0.48f));
        Ribs[Index]->SetRelativeScale3D(FVector(0.30f, 0.42f, Height / 100.0f));
        Rim[Index]->SetRelativeLocation(Direction * Radius * 0.85f + FVector(0, 0, Height + 8.0f));
        Rim[Index]->SetRelativeScale3D(FVector(1.00f, 0.62f, 0.40f));
        Rim[Index]->SetRelativeRotation(FRotator(0, FMath::RadiansToDegrees(Angle), 0));
    }
    const float Breath = bOccupied ? 0.85f + 0.15f * FMath::Sin(Time * 1.7f) : 0.6f;
    HeartLight->SetIntensity((500.0f + 1100.0f * ShownVitality) * Breath);
}
