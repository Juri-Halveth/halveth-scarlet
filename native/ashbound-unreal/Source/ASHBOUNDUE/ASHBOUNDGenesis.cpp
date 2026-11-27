#include "ASHBOUNDGenesis.h"
#include "ASHBOUNDSpell.h"
#include "ASHBOUNDGrove.h"

#include "Components/PointLightComponent.h"
#include "Components/SceneComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/Engine.h"
#include "Engine/StaticMesh.h"
#include "Engine/World.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "Materials/MaterialInterface.h"
#include "UObject/ConstructorHelpers.h"

AASHBOUNDGenesis::AASHBOUNDGenesis()
{
    PrimaryActorTick.bCanEverTick = true;
    SetActorEnableCollision(false);
    OriginRoot = CreateDefaultSubobject<USceneComponent>(TEXT("OriginRoot"));
    RootComponent = OriginRoot;
    static ConstructorHelpers::FObjectFinder<UStaticMesh> Sphere(TEXT("/Engine/BasicShapes/Sphere.Sphere"));

    Core = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("GenesisCore"));
    Core->SetupAttachment(OriginRoot);
    Core->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    Core->SetCastShadow(false);
    Core->SetRelativeScale3D(FVector(0.42f));
    if (Sphere.Succeeded()) Core->SetStaticMesh(Sphere.Object);

    for (int32 Index = 0; Index < 12; ++Index)
    {
        const FName Name(*FString::Printf(TEXT("GenesisFragment_%02d"), Index));
        UStaticMeshComponent* Fragment = CreateDefaultSubobject<UStaticMeshComponent>(Name);
        Fragment->SetupAttachment(OriginRoot);
        Fragment->SetCollisionEnabled(ECollisionEnabled::NoCollision);
        Fragment->SetCastShadow(false);
        Fragment->SetRelativeScale3D(FVector(0.06f));
        if (Sphere.Succeeded()) Fragment->SetStaticMesh(Sphere.Object);
        Fragments.Add(Fragment);
    }

    Glow = CreateDefaultSubobject<UPointLightComponent>(TEXT("GenesisGlow"));
    Glow->SetupAttachment(OriginRoot);
    Glow->SetIntensity(1100.0f);
    Glow->SetAttenuationRadius(470.0f);
    Glow->SetCastShadows(false);
    Glow->SetLightColor(FLinearColor(0.54f, 0.74f, 1.0f));
}

void AASHBOUNDGenesis::BeginPlay()
{
    Super::BeginPlay();
    UMaterialInterface* Source = LoadObject<UMaterialInterface>(nullptr,
        TEXT("/Game/ASHBOUND/Materials/M_LivingSpellSoft.M_LivingSpellSoft"));
    if (!Source)
    {
        UE_LOG(LogTemp, Error, TEXT("ASHBOUND_GENESIS material missing"));
        return;
    }
    CoreMaterial = UMaterialInstanceDynamic::Create(Source, this);
    CoreMaterial->SetVectorParameterValue(TEXT("SpellColor"), FLinearColor(0.46f, 0.68f, 1.0f));
    CoreMaterial->SetScalarParameterValue(TEXT("Radiance"), 0.75f);
    Core->SetMaterial(0, CoreMaterial);
    for (UStaticMeshComponent* Fragment : Fragments) Fragment->SetMaterial(0, CoreMaterial);
    UE_LOG(LogTemp, Display, TEXT("ASHBOUND_GENESIS ready at %s"), *GetActorLocation().ToString());
}

void AASHBOUNDGenesis::Birth()
{
    UWorld* World = GetWorld();
    if (!World) return;
    // A deliberate pulse briefly lights the soil around the stone source.
    // Previous pulse traces fade instead of filling the valley with orbs.
    for (const TObjectPtr<AASHBOUNDSpell>& Previous : BornWisps)
    {
        if (IsValid(Previous.Get())) Previous->Destroy();
    }
    BornWisps.Reset();
    ++Generation;
    PulseAge = 0.0f;
    const FVector Center = GetActorLocation();
    int32 Born = 0;
    for (int32 School = 0; School < 3; ++School)
    {
        const float Angle = (Generation * 0.37f + School / 3.0f) * 2.0f * PI;
        const FVector Probe = Center + FVector(330.0f * FMath::Cos(Angle),
                                               330.0f * FMath::Sin(Angle), 700.0f);
        FHitResult Ground;
        FCollisionQueryParams Query(SCENE_QUERY_STAT(ASHBOUNDGenesisPulseGround), false);
        Query.AddIgnoredActor(this);
        if (!World->LineTraceSingleByChannel(Ground, Probe, Probe - FVector(0, 0, 1600),
                                             ECC_Visibility, Query)) continue;
        const FVector Anchor = Ground.ImpactPoint + FVector(0, 0, 15);
        AASHBOUNDSpell* Wisp = World->SpawnActor<AASHBOUNDSpell>(
            AASHBOUNDSpell::StaticClass(), Anchor, FRotator::ZeroRotator);
        if (Wisp)
        {
            Wisp->Initialize(School, Anchor, true);
            Wisp->SetLifeSpan(7.0f);
            BornWisps.Add(Wisp);
            ++Born;
        }
    }
    UStaticMesh* Fern = LoadObject<UStaticMesh>(nullptr,
        TEXT("/Game/ASHBOUND/Models/fern_02/fern_02_1k/StaticMeshes/fern_02_b.fern_02_b"));
    int32 Grown = 0;
    if (Fern)
    {
        while (BornGroves.Num() >= 6)
        {
            if (BornGroves[0]) BornGroves[0]->Destroy();
            BornGroves.RemoveAt(0);
        }
        for (int32 Side : { -1, 1 })
        {
            const FVector Probe(Center.X + 200.0f + 90.0f * FMath::Sin(Generation * 0.8f),
                                Side * (350.0f + 45.0f * FMath::Cos(Generation * 0.9f)), 1800.0f);
            FHitResult Ground;
            FCollisionQueryParams Query(SCENE_QUERY_STAT(ASHBOUNDGenesisGround), false);
            Query.AddIgnoredActor(this);
            if (!World->LineTraceSingleByChannel(Ground, Probe, Probe - FVector(0, 0, 2600),
                                                 ECC_Visibility, Query)) continue;
            AASHBOUNDGrove* Grove = World->SpawnActor<AASHBOUNDGrove>(
                AASHBOUNDGrove::StaticClass(), Ground.ImpactPoint + FVector(0, 0, 3), FRotator::ZeroRotator);
            if (Grove)
            {
                Grove->Initialize(Fern);
                BornGroves.Add(Grove);
                ++Grown;
            }
        }
    }
    UE_LOG(LogTemp, Display, TEXT("ASHBOUND_GENESIS_GROWTH grown=%d living=%d"),
        Grown, BornGroves.Num());
    if (GEngine) GEngine->AddOnScreenDebugMessage(-1, 3.5f, FColor(172, 220, 255),
        FString::Printf(TEXT("Ursprungspuls %d · %d Bodenspuren · %d Grueninseln"), Generation, Born, Grown));
    UE_LOG(LogTemp, Display, TEXT("ASHBOUND_GENESIS_BIRTH generation=%d born=%d living=%d"),
        Generation, Born, BornWisps.Num());
}

void AASHBOUNDGenesis::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);
    Time += DeltaSeconds;
    PulseAge += DeltaSeconds;
    const float Progress = FMath::Clamp(PulseAge / 2.8f, 0.0f, 1.0f);
    const float Expansion = Progress < 1.0f ? 530.0f * FMath::Sin(PI * Progress) : 0.0f;
    const float Radius = 70.0f + Expansion;
    const float Breath = 1.0f + 0.08f * FMath::Sin(Time * 2.2f);
    Core->SetRelativeScale3D(FVector((0.20f + 0.10f * Expansion / 530.0f) * Breath));
    for (int32 Index = 0; Index < Fragments.Num(); ++Index)
    {
        const float Angle = Time * 0.65f + Index * 2.0f * PI / Fragments.Num();
        Fragments[Index]->SetRelativeLocation(FVector(Radius * FMath::Cos(Angle),
            Radius * FMath::Sin(Angle), -12.0f + 18.0f * Expansion / 530.0f));
    }
    Glow->SetIntensity(1100.0f + 6500.0f * Expansion / 530.0f);
}
