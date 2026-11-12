#include "ASHBOUNDGrove.h"

#include "Components/HierarchicalInstancedStaticMeshComponent.h"
#include "Components/SceneComponent.h"
#include "Engine/StaticMesh.h"
#include "Engine/World.h"
#include "Materials/MaterialInstanceDynamic.h"

AASHBOUNDGrove::AASHBOUNDGrove()
{
    PrimaryActorTick.bCanEverTick = true;
    SetActorEnableCollision(false);

    GroveRoot = CreateDefaultSubobject<USceneComponent>(TEXT("GroveRoot"));
    RootComponent = GroveRoot;

    Fronds = CreateDefaultSubobject<UHierarchicalInstancedStaticMeshComponent>(TEXT("Fronds"));
    Fronds->SetupAttachment(GroveRoot);
    Fronds->SetMobility(EComponentMobility::Movable);
    Fronds->SetCollisionEnabled(ECollisionEnabled::NoCollision);
}

void AASHBOUNDGrove::Initialize(UStaticMesh* FernMesh)
{
    if (!FernMesh) return;
    Fronds->SetStaticMesh(FernMesh);
    UMaterialInterface* SourceMaterial = LoadObject<UMaterialInterface>(nullptr,
        TEXT("/Game/ASHBOUND/Materials/M_GroveFern.M_GroveFern"));
    if (SourceMaterial)
    {
        VerdantMaterial = UMaterialInstanceDynamic::Create(SourceMaterial, this);
        VerdantMaterial->SetVectorParameterValue(
            TEXT("LeafTint"), FLinearColor(0.38f, 0.78f, 0.33f, 1.0f));
        Fronds->SetMaterial(0, VerdantMaterial);
        UE_LOG(LogTemp, Display, TEXT("ASHBOUND_GROVE_MATERIAL bound=/Game/ASHBOUND/Materials/M_GroveFern"));
    }
    else UE_LOG(LogTemp, Error, TEXT("ASHBOUND_GROVE_MATERIAL MISSING"));
    MatureTransforms.Reset();

    const FVector Extent = FernMesh->GetBounds().BoxExtent;
    const float Diameter = FMath::Max3(Extent.X, Extent.Y, Extent.Z) * 2.0f;
    const FVector Center = GetActorLocation();
    FRandomStream Variation(FMath::RoundToInt(Center.X * 3.0f + Center.Y * 7.0f));

    // Golden-angle placement keeps repeated casts organic while preserving a
    // small, predictable rendering and collision budget.
    constexpr int32 FrondCount = 9;
    for (int32 Index = 0; Index < FrondCount; ++Index)
    {
        const float Angle = Index * 2.3999632f;
        const float Radius = Index == 0 ? 0.0f :
            145.0f * FMath::Sqrt(static_cast<float>(Index) / (FrondCount - 1));
        FVector Offset(Radius * FMath::Cos(Angle), Radius * FMath::Sin(Angle), 0.0f);
        FHitResult Ground;
        FCollisionQueryParams Query(SCENE_QUERY_STAT(ASHBOUNDGroveGround), false);
        Query.AddIgnoredActor(this);
        if (GetWorld()->LineTraceSingleByChannel(
                Ground, Center + Offset + FVector(0, 0, 250),
                Center + Offset - FVector(0, 0, 600), ECC_Visibility, Query))
        {
            Offset.Z = Ground.ImpactPoint.Z - Center.Z + 3.0f;
        }
        const float Height = Variation.FRandRange(95.0f, 175.0f);
        const float Scale = FMath::Clamp(Height / FMath::Max(Diameter, 1.0f), 0.02f, 100.0f);
        const FRotator Rotation(0.0f, Variation.FRandRange(0.0f, 360.0f), 0.0f);
        const FTransform Mature(Rotation, Offset, FVector(Scale));
        MatureTransforms.Add(Mature);
        Fronds->AddInstance(FTransform(Rotation, Offset, FVector(0.001f)));
    }
    UE_LOG(LogTemp, Display, TEXT("ASHBOUND_GROVE spawned fronds=%d at=%s"),
           MatureTransforms.Num(), *Center.ToString());
}

void AASHBOUNDGrove::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);
    if (MatureTransforms.IsEmpty())
    {
        SetActorTickEnabled(false);
        return;
    }

    GrowthAge += DeltaSeconds;
    const float Progress = FMath::Clamp(GrowthAge / 2.2f, 0.0f, 1.0f);
    for (int32 Index = 0; Index < MatureTransforms.Num(); ++Index)
    {
        const float LocalProgress = FMath::Clamp(Progress * 1.35f - Index * 0.043f, 0.0f, 1.0f);
        const float Ease = LocalProgress * LocalProgress * (3.0f - 2.0f * LocalProgress);
        FTransform Growing = MatureTransforms[Index];
        Growing.SetScale3D(MatureTransforms[Index].GetScale3D() * FMath::Max(Ease, 0.001f));
        Fronds->UpdateInstanceTransform(Index, Growing, false, false, true);
    }
    Fronds->MarkRenderStateDirty();
    if (Progress >= 1.0f) SetActorTickEnabled(false);
}
