#include "ASHBOUNDWorldBuilder.h"

#include "Engine/World.h"
#include "EngineUtils.h"

#if WITH_EDITOR
#include "Landscape.h"
#include "LandscapeInfo.h"
#include "LandscapeProxy.h"
#include "Materials/MaterialInterface.h"
#endif

float UASHBOUNDWorldBuilder::GenesisHeightCm(float WorldXcm, float WorldYcm)
{
    const FVector2D P(WorldXcm, WorldYcm);
    const float Broad = FMath::PerlinNoise2D(P * 0.000010f);
    const float Medium = FMath::PerlinNoise2D(P * 0.000034f + FVector2D(11.7f, -5.2f));
    const float Fine = FMath::PerlinNoise2D(P * 0.000115f + FVector2D(-8.3f, 17.4f));
    const float Ridge = FMath::Square(1.0f - FMath::Abs(
        FMath::PerlinNoise2D(P * 0.000014f + FVector2D(47.1f, 9.6f))));
    const float BasinY = 34000.0f * FMath::Sin(WorldXcm * 0.000013f + 0.3f)
        + 9000.0f * FMath::Sin(WorldXcm * 0.000055f);
    const float BasinDistance = FMath::Abs(WorldYcm - BasinY);
    const float Basin = FMath::Exp(-FMath::Square(BasinDistance / 42000.0f));
    return 1800.0f + 5200.0f * Broad + 2600.0f * Medium + 700.0f * Fine
        + 6200.0f * Ridge - 4900.0f * Basin;
}

ALandscape* UASHBOUNDWorldBuilder::CreateGenesisLandscape(UObject* WorldContextObject,
    UMaterialInterface* GroundMaterial)
{
#if WITH_EDITOR
    UWorld* World = WorldContextObject ? WorldContextObject->GetWorld() : nullptr;
    if (!World || !GroundMaterial || World->WorldType != EWorldType::Editor)
    {
        UE_LOG(LogTemp, Error, TEXT("ASHBOUND_GENESIS requires an editor world and ground material"));
        return nullptr;
    }
    for (TActorIterator<ALandscape> It(World); It; ++It)
    {
        UE_LOG(LogTemp, Error, TEXT("ASHBOUND_GENESIS will not overwrite an existing Landscape"));
        return nullptr;
    }

    // 16 x 16 components, 2 x 2 subsections of 63 quads: 2016 quads over 5.04 km.
    constexpr int32 Quads = 2016;
    constexpr int32 Side = Quads + 1;
    constexpr float SpacingCm = 250.0f;
    constexpr float HalfWidthCm = Quads * SpacingCm * 0.5f;
    TArray<uint16> Heights;
    Heights.SetNumUninitialized(Side * Side);
    float MinimumCm = TNumericLimits<float>::Max();
    float MaximumCm = TNumericLimits<float>::Lowest();
    for (int32 Y = 0; Y < Side; ++Y)
    {
        const float WY = Y * SpacingCm - HalfWidthCm;
        for (int32 X = 0; X < Side; ++X)
        {
            const float WX = X * SpacingCm - HalfWidthCm;
            // Asymmetric broken ridges and a wandering basin. There is no
            // radial spawn plateau or ring-shaped artificial slope.
            const float HeightCm = GenesisHeightCm(WX, WY);
            MinimumCm = FMath::Min(MinimumCm, HeightCm);
            MaximumCm = FMath::Max(MaximumCm, HeightCm);
            // At Z scale 100, one encoded height step represents 100/128 cm.
            const int32 Encoded = FMath::RoundToInt(32768.0f + HeightCm * 1.28f);
            Heights[Y * Side + X] = static_cast<uint16>(FMath::Clamp(Encoded, 0, 65535));
        }
    }

    ALandscape* Landscape = World->SpawnActor<ALandscape>();
    if (!Landscape)
    {
        return nullptr;
    }
    Landscape->SetActorLocation(FVector(-HalfWidthCm, -HalfWidthCm, 0));
    Landscape->SetActorScale3D(FVector(SpacingCm, SpacingCm, 100.0f));
    Landscape->LandscapeMaterial = GroundMaterial;
    TMap<FGuid, TArray<uint16>> HeightByLayer;
    HeightByLayer.Add(FGuid(), MoveTemp(Heights));
    TMap<FGuid, TArray<FLandscapeImportLayerInfo>> MaterialLayers;
    MaterialLayers.Add(FGuid(), {});
    Landscape->Import(FGuid::NewGuid(), 0, 0, Quads, Quads, 2, 63,
        HeightByLayer, TEXT(""), MaterialLayers,
        ELandscapeImportAlphamapType::Additive, TArrayView<const FLandscapeLayer>());
    if (ULandscapeInfo* Info = Landscape->GetLandscapeInfo())
    {
        Info->UpdateLayerInfoMap(Landscape);
    }
    Landscape->MarkPackageDirty();
    UE_LOG(LogTemp, Display,
        TEXT("ASHBOUND_GENESIS_TERRAIN width_cm=%f quads=%d spacing_cm=%f min_z_cm=%f max_z_cm=%f components=%d"),
        2.0f * HalfWidthCm, Quads, SpacingCm, MinimumCm, MaximumCm,
        Landscape->LandscapeComponents.Num());
    return Landscape;
#else
    return nullptr;
#endif
}
