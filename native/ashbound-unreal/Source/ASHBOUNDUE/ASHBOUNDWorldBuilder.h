#pragma once

#include "CoreMinimal.h"
#include "Kismet/BlueprintFunctionLibrary.h"
#include "ASHBOUNDWorldBuilder.generated.h"

class ALandscape;
class UMaterialInterface;

/** Editor authoring entrypoint. The resulting Landscape is a saved native map asset. */
UCLASS()
class ASHBOUNDUE_API UASHBOUNDWorldBuilder : public UBlueprintFunctionLibrary
{
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintPure, Category="ASHBOUND|World")
    static float GenesisHeightCm(float WorldXcm, float WorldYcm);

    UFUNCTION(BlueprintCallable, Category="ASHBOUND|World", meta=(WorldContext="WorldContextObject"))
    static ALandscape* CreateGenesisLandscape(UObject* WorldContextObject,
        UMaterialInterface* GroundMaterial);

};
