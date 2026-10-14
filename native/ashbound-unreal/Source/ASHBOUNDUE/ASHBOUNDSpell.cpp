#include "ASHBOUNDSpell.h"
#include "ASHBOUNDGrove.h"
#include "ASHBOUNDGrimoire.h"
#include "ASHBOUNDSeal.h"

#include "Components/PointLightComponent.h"
#include "Components/SceneComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/PointLight.h"
#include "Engine/StaticMesh.h"
#include "Engine/World.h"
#include "EngineUtils.h"
#include "GameFramework/Pawn.h"
#include "Kismet/GameplayStatics.h"
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
    // Asset authoring runs after the first editor module load. Avoid a false
    // missing-asset error in that first commandlet; later loads still bind the
    // material as a hard UPROPERTY reference for cooking.
    static ConstructorHelpers::FObjectFinderOptional<UMaterialInterface> Material(
        TEXT("/Game/ASHBOUND/Materials/M_LivingSpellSoft.M_LivingSpellSoft"), LOAD_NoWarn);
    SpellMaterial = Material.Get();

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
        UE_LOG(LogTemp, Display, TEXT("ASHBOUND_SPELL_MATERIAL bound=%s"),
            *SpellMaterial->GetPathName());
        DynamicMaterial = UMaterialInstanceDynamic::Create(SpellMaterial, this);
        CoreMesh->SetMaterial(0, DynamicMaterial);
        for (UStaticMeshComponent* Satellite : Satellites)
        {
            Satellite->SetMaterial(0, DynamicMaterial);
        }
    }
    else
    {
        UE_LOG(LogTemp, Error, TEXT("ASHBOUND_SPELL_MATERIAL MISSING"));
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
        DynamicMaterial->SetScalarParameterValue(TEXT("Radiance"), 1.5f);
    }
}

void AASHBOUNDSpell::ApplyWorldEffect(const FHitResult* FlightImpact)
{
    UWorld* World = GetWorld();
    if (!World) return;

    if (FlightImpact)
    {
        // A blocking wall must not charge a nearby seal behind it.
        if (AASHBOUNDSeal* Seal = Cast<AASHBOUNDSeal>(FlightImpact->GetActor()))
        {
            Seal->Activate(School);
        }
    }
    else
    {
        // Aimed casts stop short of the seal core; keep their direct activation.
        for (TActorIterator<AASHBOUNDSeal> It(World); It; ++It)
        {
            if (It->GetRequiredSchool() != School ||
                FVector::Dist(It->GetActorLocation(), Target) >= 175.0f)
            {
                continue;
            }
            FHitResult SealHit;
            FCollisionQueryParams Query(SCENE_QUERY_STAT(ASHBOUNDSealReach), false);
            Query.AddIgnoredActor(this);
            if (World->LineTraceSingleByChannel(SealHit, Target, It->GetActorLocation(),
                                                ECC_Visibility, Query) &&
                SealHit.GetActor() == *It)
            {
                It->Activate(School);
            }
        }
    }
    bool bSchoolBookStudied = false;
    // Ilyra -> Ember, Neral -> Resonance, Kael -> Reweave.
    const int32 RequiredVolume = School == 0 ? 1 : (School == 1 ? 0 : 2);
    for (TActorIterator<AASHBOUNDGrimoire> It(World); It; ++It)
    {
        if (It->VolumeIndex == RequiredVolume && It->IsStudied())
        {
            bSchoolBookStudied = true;
            break;
        }
    }

    if (School == 0)
    {
        AASHBOUNDSpell* Echo = World->SpawnActor<AASHBOUNDSpell>(
            AASHBOUNDSpell::StaticClass(), Target, FRotator::ZeroRotator);
        if (Echo)
        {
            Echo->Initialize(0, Target, true);
            const float Duration = bSchoolBookStudied ? 45.0f : 18.0f;
            Echo->SetLifeSpan(Duration);
            UE_LOG(LogTemp, Display, TEXT("ASHBOUND_BOOK_POWER school=0 volume=1 duration=%.0f"), Duration);
            UE_LOG(LogTemp, Display, TEXT("ASHBOUND world effect: Resonance echo at %s"), *Target.ToString());
        }
        return;
    }
    if (School == 1)
    {
        APointLight* Ember = World->SpawnActor<APointLight>(
            APointLight::StaticClass(), Target + FVector(0, 0, 90), FRotator::ZeroRotator);
        if (Ember)
        {
            Ember->SetMobility(EComponentMobility::Movable);
            if (UPointLightComponent* Light = Cast<UPointLightComponent>(Ember->GetLightComponent()))
            {
                Light->SetLightColor(FLinearColor(1.0f, 0.31f, 0.075f));
                Light->SetIntensity(8000.0f);
                Light->SetAttenuationRadius(1200.0f);
            }
            const float Duration = bSchoolBookStudied ? 60.0f : 24.0f;
            Ember->SetLifeSpan(Duration);
            UE_LOG(LogTemp, Display, TEXT("ASHBOUND_BOOK_POWER school=1 volume=0 duration=%.0f"), Duration);
            UE_LOG(LogTemp, Display, TEXT("ASHBOUND world effect: Ember light at %s"), *Target.ToString());
        }
        return;
    }

    UStaticMesh* Fern = LoadObject<UStaticMesh>(nullptr,
        TEXT("/Game/ASHBOUND/Models/fern_02/fern_02_1k/StaticMeshes/fern_02_b.fern_02_b"));
    if (!Fern)
    {
        UE_LOG(LogTemp, Warning, TEXT("ASHBOUND Reweave fern asset missing"));
        return;
    }
    FVector Landing = Target;
    FVector GroundProbe = Target;
    if (FlightImpact && FlightImpact->ImpactNormal.Z < 0.45f)
    {
        // A spell striking a wall grows on the near side, at ground level.
        GroundProbe += FlightImpact->ImpactNormal * 120.0f;
    }
    FHitResult Hit;
    FCollisionQueryParams Query(SCENE_QUERY_STAT(ASHBOUNDReweave), false);
    Query.AddIgnoredActor(this);
    if (World->LineTraceSingleByChannel(Hit, GroundProbe + FVector(0, 0, 250),
                                        GroundProbe - FVector(0, 0, 1300), ECC_Visibility, Query))
    {
        Landing = Hit.ImpactPoint + FVector(0, 0, 3);
    }
    // Kael's studied volume keeps growth for the session. Recycle the oldest grove so
    // unlimited casting cannot accumulate unlimited draw calls or memory.
    AASHBOUNDGrove* Oldest = nullptr;
    int32 GroveCount = 0;
    for (TActorIterator<AASHBOUNDGrove> It(World); It; ++It)
    {
        ++GroveCount;
        if (!Oldest || It->GetGameTimeSinceCreation() > Oldest->GetGameTimeSinceCreation())
            Oldest = *It;
    }
    if (GroveCount >= 24 && Oldest) Oldest->Destroy();

    AASHBOUNDGrove* Growth = World->SpawnActor<AASHBOUNDGrove>(
        AASHBOUNDGrove::StaticClass(), Landing, FRotator::ZeroRotator);
    if (Growth)
    {
        Growth->Initialize(Fern);
        if (!bSchoolBookStudied) Growth->SetLifeSpan(120.0f);
        UE_LOG(LogTemp, Display, TEXT("ASHBOUND_BOOK_POWER school=2 volume=2 persistent=%d"),
            bSchoolBookStudied ? 1 : 0);
        UE_LOG(LogTemp, Display, TEXT("ASHBOUND world effect: Reweave growth at %s"), *Landing.ToString());
    }
}

void AASHBOUNDSpell::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);
    Age += DeltaSeconds;
    const float Phase = Age * (bAmbient ? 1.5f : 3.2f);
    FVector Center = GetActorLocation();
    FHitResult FlightHit;
    bool bBlockingImpact = false;
    if (bAmbient)
    {
        Center = Target + FVector(30.0f * FMath::Sin(Phase * 0.7f),
                                  30.0f * FMath::Cos(Phase * 0.7f),
                                  35.0f * FMath::Sin(Phase));
    }
    else if (!bApplied)
    {
        const float Progress = FMath::Clamp(Age / 2.6f, 0.0f, 1.0f);
        const float Ease = Progress * Progress * (3.0f - 2.0f * Progress);
        FVector NextCenter = FMath::Lerp(Origin, Target, Ease);
        NextCenter.Z += 80.0f * FMath::Sin(PI * Progress);

        if (UWorld* World = GetWorld())
        {
            FCollisionQueryParams Query(SCENE_QUERY_STAT(ASHBOUNDSpellFlight), false);
            Query.AddIgnoredActor(this);
            if (AActor* OwnerActor = GetOwner()) Query.AddIgnoredActor(OwnerActor);
            if (APawn* InstigatorPawn = GetInstigator()) Query.AddIgnoredActor(InstigatorPawn);
            // CastSchool currently spawns without an owner or instigator.
            if (APawn* PlayerPawn = UGameplayStatics::GetPlayerPawn(this, 0))
            {
                Query.AddIgnoredActor(PlayerPawn);
            }
            bBlockingImpact = World->LineTraceSingleByChannel(
                FlightHit, Center, NextCenter, ECC_Visibility, Query);
        }
        Center = bBlockingImpact ? FlightHit.ImpactPoint : NextCenter;
        if (bBlockingImpact)
            UE_LOG(LogTemp, Display, TEXT("ASHBOUND spell impact actor=%s point=%s"),
                   FlightHit.GetActor() ? *FlightHit.GetActor()->GetName() : TEXT("NONE"),
                   *Center.ToString());
    }
    SetActorLocation(Center, false);

    if (!bAmbient && !bApplied && (bBlockingImpact || Age >= 2.6f))
    {
        bApplied = true;
        Target = Center;
        ApplyWorldEffect(bBlockingImpact ? &FlightHit : nullptr);
    }
    if (!bAmbient && Age >= 3.7f)
    {
        Destroy();
        return;
    }

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
