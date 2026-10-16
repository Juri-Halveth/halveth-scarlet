#include "ASHBOUNDStoryHUD.h"
#include "ASHBOUNDGenesisEcology.h"
#include "ASHBOUNDSpellManager.h"

#include "Engine/Canvas.h"
#include "Engine/Engine.h"
#include "EngineUtils.h"

void AASHBOUNDStoryHUD::DrawHUD()
{
    Super::DrawHUD();
    if (!Canvas || !GEngine) return;
    if (!Story.IsValid())
    {
        for (TActorIterator<AASHBOUNDSpellManager> It(GetWorld()); It; ++It)
        {
            Story = *It;
            break;
        }
    }
    const AASHBOUNDSpellManager* Manager = Story.Get();

    const float Scale = FMath::Clamp(Canvas->SizeY / 1440.0f, 0.68f, 1.55f);
    const float Left = 44.0f * Scale;
    const FLinearColor Quiet(0.62f, 0.83f, 0.83f, 0.92f);
    const FLinearColor Bright(0.92f, 0.96f, 0.90f, 0.96f);
    DrawText(Manager ? TEXT("ASHBOUND  /  KAPITEL I") : TEXT("ASHBOUND  /  GENESISWELT"), Quiet, Left, 40.0f * Scale,
             GEngine->GetSmallFont(), 1.5f * Scale, false);
    if (Manager)
        DrawText(Manager->GetObjective(), Bright, Left, 78.0f * Scale,
                 GEngine->GetSmallFont(), 1.72f * Scale, false);

    if (!Ecology.IsValid())
        for (TActorIterator<AASHBOUNDGenesisEcology> It(GetWorld()); It; ++It)
        {
            Ecology = *It;
            break;
        }
    if (const AASHBOUNDGenesisEcology* Ground = Ecology.Get())
    {
        const float Right = Canvas->SizeX - 390.0f * Scale;
        const float Hour = Ground->GetHour();
        DrawText(FString::Printf(TEXT("Jahr %d · Tag %03d  /  %02d:%02d"),
            Ground->GetYear(), Ground->GetDayOfYear(), FMath::FloorToInt(Hour),
            FMath::FloorToInt((Hour - FMath::FloorToFloat(Hour)) * 60.0f)),
            Quiet, Right, 40.0f * Scale, GEngine->GetSmallFont(),
            1.3f * Scale, false);
        if (Ground->HasGroundProfile())
        {
            const FASHBOUNDSoilProfile& Soil = Ground->GetGroundProfile();
            DrawText(FString::Printf(TEXT("Boden  Humus %.0f  Mineral %.0f  Fels ab %.0f cm"),
                Soil.OrganicCm, Soil.MineralCm, Soil.BedrockDepthCm),
                Quiet, Right, 69.0f * Scale, GEngine->GetSmallFont(),
                1.1f * Scale, false);
        }
    }
    if (!Manager) return;

    if (Manager->IsJournalOpen())
    {
        DrawText(TEXT("JOURNAL   J zum Schließen"), Bright, Left, 134.0f * Scale,
                 GEngine->GetSmallFont(), 1.45f * Scale, false);
        DrawText(Manager->GetJournalLine(), Quiet, Left, 174.0f * Scale,
                 GEngine->GetSmallFont(), 1.3f * Scale, false);
        DrawText(TEXT("WASD Gehen   Q Resonanz   E Glut   R Neufassung   T Zeugin"), Quiet,
                 Left, 210.0f * Scale, GEngine->GetSmallFont(), 1.2f * Scale, false);
    }

    const FString& Prompt = Manager->GetInteractionPrompt();
    if (!Prompt.IsEmpty())
    {
        DrawText(Prompt, Bright, Left, Canvas->SizeY - 116.0f * Scale,
                 GEngine->GetSmallFont(), 1.5f * Scale, false);
    }
    const FString& Spoken = Manager->GetStoryLine();
    if (!Spoken.IsEmpty())
    {
        DrawText(Spoken, Bright, Left, Canvas->SizeY - 76.0f * Scale,
                 GEngine->GetMediumFont(), 1.4f * Scale, false);
    }
}
