#include "ASHBOUNDSeal.h"
#include "ASHBOUNDArchiveGate.h"

#include "Components/PointLightComponent.h"
#include "Components/SceneComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/Engine.h"
#include "Engine/StaticMesh.h"
#include "EngineUtils.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "Materials/MaterialInterface.h"
#include "UObject/ConstructorHelpers.h"

namespace
{
FLinearColor SealColor(int32 School)
{
    if (School == 1) return FLinearColor(1.0f, 0.27f, 0.06f);
    if (School == 2) return FLinearColor(0.60f, 0.22f, 1.0f);
    return FLinearColor(0.04f, 0.82f, 1.0f);
}
}

AASHBOUNDSeal::AASHBOUNDSeal()
{
    PrimaryActorTick.bCanEverTick = true;
    SealRoot = CreateDefaultSubobject<USceneComponent>(TEXT("SealRoot"));
    RootComponent = SealRoot;
    SealCore = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("SealCore"));
    SealCore->SetupAttachment(SealRoot);
    SealCore->SetRelativeScale3D(FVector(0.64f));
    SealCore->SetCollisionProfileName(TEXT("BlockAll"));
    SealCore->SetCastShadow(false);
    static ConstructorHelpers::FObjectFinder<UStaticMesh> Sphere(TEXT("/Engine/BasicShapes/Sphere.Sphere"));
    if (Sphere.Succeeded()) SealCore->SetStaticMesh(Sphere.Object);
    Glow = CreateDefaultSubobject<UPointLightComponent>(TEXT("SealGlow"));
    Glow->SetupAttachment(SealRoot);
    Glow->SetIntensity(1100.0f);
    Glow->SetAttenuationRadius(480.0f);
    Glow->SetCastShadows(false);
}

void AASHBOUNDSeal::BeginPlay()
{
    Super::BeginPlay();
    UMaterialInterface* Material = LoadObject<UMaterialInterface>(nullptr,
        TEXT("/Game/ASHBOUND/Materials/M_LivingSpell.M_LivingSpell"));
    if (Material)
    {
        DynamicMaterial = UMaterialInstanceDynamic::Create(Material, this);
        SealCore->SetMaterial(0, DynamicMaterial);
        DynamicMaterial->SetVectorParameterValue(TEXT("SpellColor"), SealColor(RequiredSchool));
        DynamicMaterial->SetScalarParameterValue(TEXT("Radiance"), 3.0f);
    }
    Glow->SetLightColor(SealColor(RequiredSchool));
}

void AASHBOUNDSeal::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);
    Time += DeltaSeconds;
    const float Pulse = 1.0f + 0.09f * FMath::Sin(Time * (bActive ? 5.0f : 2.0f));
    SealCore->SetRelativeScale3D(FVector(0.64f * Pulse));
}

bool AASHBOUNDSeal::Activate(int32 SpellSchool)
{
    if (bActive || SpellSchool != RequiredSchool) return false;
    bActive = true;
    Glow->SetIntensity(4600.0f);
    if (DynamicMaterial) DynamicMaterial->SetScalarParameterValue(TEXT("Radiance"), 12.0f);
    UE_LOG(LogTemp, Display, TEXT("ASHBOUND seal charged school=%d at %s"),
           RequiredSchool, *GetActorLocation().ToString());
    int32 Count = 0;
    int32 Charged = 0;
    for (TActorIterator<AASHBOUNDSeal> It(GetWorld()); It; ++It)
    {
        ++Count;
        if (It->IsActive()) ++Charged;
    }
    if (GEngine) GEngine->AddOnScreenDebugMessage(-1, 4.0f, FColor(180, 238, 255),
        FString::Printf(TEXT("Archivzeichen %d / %d"), Charged, Count));
    if (Count == 3 && Charged == Count)
    {
        for (TActorIterator<AASHBOUNDArchiveGate> It(GetWorld()); It; ++It)
        {
            It->OpenGate();
        }
    }
    return true;
}
