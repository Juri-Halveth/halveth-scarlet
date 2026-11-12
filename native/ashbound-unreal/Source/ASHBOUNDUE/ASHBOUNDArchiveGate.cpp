#include "ASHBOUNDArchiveGate.h"

#include "Components/StaticMeshComponent.h"
#include "Engine/StaticMesh.h"
#include "UObject/ConstructorHelpers.h"

AASHBOUNDArchiveGate::AASHBOUNDArchiveGate()
{
    PrimaryActorTick.bCanEverTick = true;
    PrimaryActorTick.bStartWithTickEnabled = false;
    DoorMesh = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("ArchiveDoor"));
    RootComponent = DoorMesh;
    DoorMesh->SetMobility(EComponentMobility::Movable);
    DoorMesh->SetCollisionProfileName(TEXT("BlockAll"));
    DoorMesh->SetRelativeScale3D(FVector(0.42f, 4.2f, 3.8f));
    static ConstructorHelpers::FObjectFinder<UStaticMesh> Cube(TEXT("/Engine/BasicShapes/Cube.Cube"));
    if (Cube.Succeeded()) DoorMesh->SetStaticMesh(Cube.Object);
    SetActorTickEnabled(false);
}

void AASHBOUNDArchiveGate::OpenGate()
{
    if (bOpening) return;
    ClosedLocation = GetActorLocation();
    bOpening = true;
    SetActorTickEnabled(true);
    UE_LOG(LogTemp, Display, TEXT("ASHBOUND archive gate opening; story condition met"));
}

void AASHBOUNDArchiveGate::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);
    if (!bOpening) return;
    OpenProgress = FMath::Min(1.0f, OpenProgress + DeltaSeconds / 2.6f);
    const float Smooth = OpenProgress * OpenProgress * (3.0f - 2.0f * OpenProgress);
    SetActorLocation(ClosedLocation + FVector(0, 0, 500.0f * Smooth));
    if (OpenProgress >= 1.0f)
    {
        DoorMesh->SetCollisionEnabled(ECollisionEnabled::NoCollision);
        SetActorTickEnabled(false);
        UE_LOG(LogTemp, Display, TEXT("ASHBOUND archive gate open; east passage walkable"));
    }
}
