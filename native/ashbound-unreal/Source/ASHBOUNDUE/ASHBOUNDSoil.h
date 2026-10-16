#pragma once

#include "CoreMinimal.h"

// A deterministic surface profile in centimetres. It describes a sampled
// column beneath the Landscape, not editable voxels or excavated geometry.
struct FASHBOUNDSoilProfile
{
    float OrganicCm = 0.0f;
    float MineralCm = 0.0f;
    float BedrockDepthCm = 0.0f;
    float Moisture = 0.0f;
    float SolarExposure = 0.0f;
    float RootCapacity = 0.0f;
};

struct FASHBOUNDSoil
{
    static FVector SunVector(int32 DayOfYear, float Hour)
    {
        const float Latitude = FMath::DegreesToRadians(50.0f);
        const float Declination = FMath::DegreesToRadians(23.44f) *
            FMath::Sin(2.0f * PI * (FMath::Clamp(DayOfYear, 1, 365) - 81) / 365.0f);
        const float HourAngle = FMath::DegreesToRadians(15.0f * (Hour - 12.0f));
        const float East = -FMath::Cos(Declination) * FMath::Sin(HourAngle);
        const float North = FMath::Cos(Latitude) * FMath::Sin(Declination) -
            FMath::Sin(Latitude) * FMath::Cos(Declination) * FMath::Cos(HourAngle);
        const float Up = FMath::Sin(Latitude) * FMath::Sin(Declination) +
            FMath::Cos(Latitude) * FMath::Cos(Declination) * FMath::Cos(HourAngle);
        return FVector(East, North, Up).GetSafeNormal();
    }

    static FASHBOUNDSoilProfile Sample(const FVector& Ground,
        const FVector& Normal, int32 DayOfYear)
    {
        const FVector UnitNormal = Normal.GetSafeNormal();
        const float Slope = FMath::Clamp(1.0f - UnitNormal.Z, 0.0f, 1.0f);
        const FVector2D P(Ground.X, Ground.Y);
        const float RainRegion = FMath::PerlinNoise2D(P * 0.000018f + FVector2D(17.0f, -9.0f));
        const float Drainage = FMath::PerlinNoise2D(P * 0.000065f + FVector2D(-3.0f, 11.0f));
        const float Altitude = FMath::Clamp((Ground.Z - 2500.0f) / 11000.0f, 0.0f, 1.0f);
        // Midday exposure describes a long-term aspect effect. Hourly light
        // changes do not instantly rebuild a soil horizon.
        const float Solar = FMath::Clamp(FVector::DotProduct(
            UnitNormal, SunVector(DayOfYear, 12.0f)), 0.0f, 1.0f);
        // Fictional temperate climate: wetter winter, drier summer.
        const float SeasonRain = 0.08f * FMath::Cos(2.0f * PI *
            FMath::Clamp(DayOfYear, 1, 365) / 365.0f);
        FASHBOUNDSoilProfile Result;
        Result.SolarExposure = Solar;
        Result.Moisture = FMath::Clamp(0.58f + 0.22f * RainRegion +
            0.12f * Drainage + SeasonRain - 0.26f * Slope -
            0.22f * Altitude - 0.12f * Solar, 0.0f, 1.0f);
        Result.BedrockDepthCm = FMath::Clamp(165.0f * (1.0f - Slope) *
            (1.0f - 0.45f * Altitude) + 42.0f * Drainage, 8.0f, 220.0f);
        Result.OrganicCm = FMath::Min(Result.BedrockDepthCm * 0.3f,
            3.0f + 24.0f * Result.Moisture * (1.0f - Altitude));
        Result.MineralCm = Result.BedrockDepthCm - Result.OrganicCm;
        Result.RootCapacity = FMath::Clamp((Result.BedrockDepthCm - 15.0f) /
            100.0f, 0.0f, 1.0f) * FMath::Clamp(Result.Moisture * 1.7f,
            0.0f, 1.0f);
        return Result;
    }
};
