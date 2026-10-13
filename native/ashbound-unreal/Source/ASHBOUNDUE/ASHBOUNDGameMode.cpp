#include "ASHBOUNDGameMode.h"

#include "EngineUtils.h"
#include "GameFramework/PlayerController.h"
#include "GameFramework/PlayerStart.h"
#include "UObject/ConstructorHelpers.h"

AASHBOUNDGameMode::AASHBOUNDGameMode()
{
    static ConstructorHelpers::FClassFinder<APawn> Character(
        TEXT("/Game/FirstPerson/Blueprints/BP_FirstPersonCharacter"));
    if (Character.Succeeded()) DefaultPawnClass = Character.Class;

    static ConstructorHelpers::FClassFinder<APlayerController> Controller(
        TEXT("/Game/FirstPerson/Blueprints/BP_FirstPersonPlayerController"));
    if (Controller.Succeeded()) PlayerControllerClass = Controller.Class;
}

AActor* AASHBOUNDGameMode::ChoosePlayerStart_Implementation(AController* Player)
{
    for (TActorIterator<APlayerStart> It(GetWorld()); It; ++It)
    {
        UE_LOG(LogTemp, Display, TEXT("ASHBOUND player start %s at %s"),
            *It->GetName(), *It->GetActorLocation().ToString());
        return *It;
    }
    return Super::ChoosePlayerStart_Implementation(Player);
}
