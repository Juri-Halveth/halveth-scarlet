#pragma once

#include "CoreMinimal.h"

// A deterministic sampled column beneath the Landscape. The companion volume
// query has spatial strata, but the Landscape is not yet excavatable geometry.
struct FASHBOUNDSoilProfile
{
    float OrganicCm = 0.0f;
    float MineralCm = 0.0f;
    float BedrockDepthCm = 0.0f;
    float Moisture = 0.0f;
    float SolarExposure = 0.0f;
    float RootCapacity = 0.0f;
};

enum class EASHBOUNDSoilMatter : uint8
{
    Air,
    Organic,
    Mineral,
    WeatheredRock,
    Bedrock
};

struct FASHBOUNDSoilVolumeSample
{
    EASHBOUNDSoilMatter Matter = EASHBOUNDSoilMatter::Air;
    float DepthCm = 0.0f;
    float OrganicBottomCm = 0.0f;
    float RockTopCm = 0.0f;
    float Moisture = 0.0f;
    float Porosity = 0.0f;
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

    // World-space query. Horizons undulate at different spatial scales, and
    // local 3D grain varies moisture, porosity and weathering. The ground elevation is supplied
    // by the collision Landscape, so the same (X,Y,Z) can be queried by
    // ecology, future digging and a visible geological cut without inventing
    // a second surface. These are model units, not measured soil chemistry.
    static FASHBOUNDSoilVolumeSample SampleVolume(const FVector& Position,
        float SurfaceZCm, const FVector& SurfaceNormal, int32 DayOfYear)
    {
        FASHBOUNDSoilVolumeSample Result;
        Result.DepthCm = SurfaceZCm - Position.Z;
        if (Result.DepthCm < 0.0f) return Result;

        const FASHBOUNDSoilProfile Profile = Sample(
            FVector(Position.X, Position.Y, SurfaceZCm), SurfaceNormal, DayOfYear);
        const FVector2D XY(Position.X, Position.Y);
        const float Broad = FMath::PerlinNoise2D(XY * 0.00032f + FVector2D(4.1f, -7.3f));
        const float Fine = FMath::PerlinNoise2D(XY * 0.0025f + FVector2D(-13.7f, 5.2f));
        Result.OrganicBottomCm = FMath::Clamp(Profile.OrganicCm + 4.0f * Broad +
            1.5f * Fine, 1.0f, Profile.BedrockDepthCm * 0.4f);
        Result.RockTopCm = FMath::Max(Result.OrganicBottomCm + 8.0f,
            Profile.BedrockDepthCm + 26.0f * Broad + 9.0f * Fine);
        const float Grain = FMath::PerlinNoise3D(Position * 0.004f +
            FVector(2.0f, -3.0f, 7.0f));
        const float WeatheringCm = 18.0f + 18.0f * FMath::Abs(Grain);

        if (Result.DepthCm < Result.OrganicBottomCm)
            Result.Matter = EASHBOUNDSoilMatter::Organic;
        else if (Result.DepthCm < Result.RockTopCm - WeatheringCm)
            Result.Matter = EASHBOUNDSoilMatter::Mineral;
        else if (Result.DepthCm < Result.RockTopCm)
            Result.Matter = EASHBOUNDSoilMatter::WeatheredRock;
        else
            Result.Matter = EASHBOUNDSoilMatter::Bedrock;

        const float DepthDrying = FMath::Clamp(Result.DepthCm / 450.0f, 0.0f, 1.0f);
        Result.Moisture = FMath::Clamp(Profile.Moisture + 0.16f * DepthDrying +
            0.08f * Grain, 0.0f, 1.0f);
        Result.Porosity = FMath::Clamp((Result.Matter == EASHBOUNDSoilMatter::Bedrock ?
            0.06f : Result.Matter == EASHBOUNDSoilMatter::WeatheredRock ? 0.18f :
            Result.Matter == EASHBOUNDSoilMatter::Mineral ? 0.38f : 0.65f) +
            0.04f * Grain, 0.01f, 0.8f);
        return Result;
    }
};
