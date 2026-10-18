#include "ASHBOUNDMirrorGameMode.h"

#include "GameFramework/PlayerController.h"
#include "UObject/ConstructorHelpers.h"

AASHBOUNDMirrorGameMode::AASHBOUNDMirrorGameMode()
{
    static ConstructorHelpers::FClassFinder<APawn> Character(
        TEXT("/Game/FirstPerson/Blueprints/BP_FirstPersonCharacter"));
    if (Character.Succeeded()) DefaultPawnClass = Character.Class;

    static ConstructorHelpers::FClassFinder<APlayerController> Controller(
        TEXT("/Game/FirstPerson/Blueprints/BP_FirstPersonPlayerController"));
    if (Controller.Succeeded()) PlayerControllerClass = Controller.Class;
}
