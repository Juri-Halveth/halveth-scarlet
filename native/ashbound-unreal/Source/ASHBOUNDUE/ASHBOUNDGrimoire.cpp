#include "ASHBOUNDGrimoire.h"

#include "Camera/CameraComponent.h"
#include "Components/PointLightComponent.h"
#include "Components/SceneComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Components/TextRenderComponent.h"
#include "Engine/Engine.h"
#include "Engine/Font.h"
#include "Engine/StaticMesh.h"
#include "GameFramework/PlayerController.h"
#include "Kismet/GameplayStatics.h"
#include "Materials/MaterialInterface.h"
#include "UObject/ConstructorHelpers.h"

AASHBOUNDGrimoire::AASHBOUNDGrimoire()
{
    PrimaryActorTick.bCanEverTick = true;
    SetActorEnableCollision(false);
    BookRoot = CreateDefaultSubobject<USceneComponent>(TEXT("BookRoot"));
    RootComponent = BookRoot;

    static ConstructorHelpers::FObjectFinder<UStaticMesh> Cube(TEXT("/Engine/BasicShapes/Cube.Cube"));
    ClosedBook = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("ClosedBook"));
    ClosedBook->SetupAttachment(BookRoot);
    ClosedBook->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    ClosedBook->SetCastShadow(true);
    ClosedBook->SetRelativeScale3D(FVector(0.58f, 0.42f, 0.09f));
    if (Cube.Succeeded()) ClosedBook->SetStaticMesh(Cube.Object);

    LeftCover = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("LeftCover"));
    RightCover = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("RightCover"));
    LeftPage = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("LeftPage"));
    RightPage = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("RightPage"));
    UStaticMeshComponent* Pieces[] = {LeftCover, RightCover, LeftPage, RightPage};
    for (UStaticMeshComponent* Piece : Pieces)
    {
        Piece->SetupAttachment(BookRoot);
        Piece->SetCollisionEnabled(ECollisionEnabled::NoCollision);
        Piece->SetCastShadow(false);
        if (Cube.Succeeded()) Piece->SetStaticMesh(Cube.Object);
    }
    LeftCover->SetRelativeScale3D(FVector(0.65f, 0.34f, 0.018f));
    RightCover->SetRelativeScale3D(FVector(0.65f, 0.34f, 0.018f));
    LeftPage->SetRelativeScale3D(FVector(0.61f, 0.31f, 0.018f));
    RightPage->SetRelativeScale3D(FVector(0.61f, 0.31f, 0.018f));

    LeftText = CreateDefaultSubobject<UTextRenderComponent>(TEXT("LeftText"));
    RightText = CreateDefaultSubobject<UTextRenderComponent>(TEXT("RightText"));
    LeftText->SetupAttachment(BookRoot);
    RightText->SetupAttachment(BookRoot);
    static ConstructorHelpers::FObjectFinder<UFont> ReadingFont(TEXT("/Engine/EngineFonts/RobotoDistanceField.RobotoDistanceField"));
    for (UTextRenderComponent* Text : {LeftText.Get(), RightText.Get()})
    {
        if (ReadingFont.Succeeded()) Text->SetFont(ReadingFont.Object);
        Text->SetWorldSize(3.5f);
        Text->SetTextRenderColor(FColor(22, 18, 13));
        Text->SetHorizontalAlignment(EHTA_Left);
        Text->SetVerticalAlignment(EVRTA_TextTop);
        Text->SetRelativeRotation(FRotator(90, 180, 0));
    }
    ReadingLight = CreateDefaultSubobject<UPointLightComponent>(TEXT("ReadingLight"));
    ReadingLight->SetupAttachment(BookRoot);
    ReadingLight->SetRelativeLocation(FVector(0, 0, 32));
    ReadingLight->SetIntensity(180.0f);
    ReadingLight->SetLightColor(FLinearColor(1.0f, 0.72f, 0.42f));
    ReadingLight->SetAttenuationRadius(350.0f);
    ReadingLight->SetCastShadows(false);

    ReadingCamera = CreateDefaultSubobject<UCameraComponent>(TEXT("ReadingCamera"));
    ReadingCamera->SetupAttachment(BookRoot);
    ReadingCamera->SetFieldOfView(50.0f);
}

void AASHBOUNDGrimoire::BeginPlay()
{
    Super::BeginPlay();
    UMaterialInterface* Leather = LoadObject<UMaterialInterface>(nullptr,
        TEXT("/Game/ASHBOUND/Materials/M_VaultLeather.M_VaultLeather"));
    UMaterialInterface* Paper = LoadObject<UMaterialInterface>(nullptr,
        TEXT("/Game/ASHBOUND/Materials/M_VaultPaper.M_VaultPaper"));
    if (Leather)
    {
        LeftCover->SetMaterial(0, Leather);
        RightCover->SetMaterial(0, Leather);
    }
    if (Paper)
    {
        LeftPage->SetMaterial(0, Paper);
        RightPage->SetMaterial(0, Paper);
    }
    LeftCover->SetVisibility(false);
    RightCover->SetVisibility(false);
    LeftPage->SetVisibility(false);
    RightPage->SetVisibility(false);
    LeftText->SetVisibility(false);
    RightText->SetVisibility(false);
    ReadingLight->SetVisibility(false);
    const FVector CameraLocation = GetActorLocation() + FVector(-150, 0, 98);
    ReadingCamera->SetWorldLocation(CameraLocation);
    ReadingCamera->SetWorldRotation((GetActorLocation() - CameraLocation).Rotation());
    SetActorTickEnabled(false);
}

void AASHBOUNDGrimoire::ShowPage()
{
    static const TCHAR* Left[] = {
        TEXT("DAS ECHO\n\nStein behält nicht\nunsere Worte.\nEr behält die Wege,\ndie wir öffnen."),
        TEXT("DIE GLUT\n\nLicht zeigt eine Spur,\ndoch es bestimmt\nnicht den Weg."),
        TEXT("DIE NEUFASSUNG\n\nWo Asche ruht,\nkann ein neuer\nAnfang wachsen.")
    };
    static const TCHAR* Right[] = {
        TEXT("Suche die drei\nhellen Zeichen\nim alten Gewölbe.\n\nResonanz bleibt\nnun länger."),
        TEXT("Prüfe nicht nur\nden Schein.\nBeachte, was er\nverändert."),
        TEXT("Eine Spur bleibt\nin dieser Welt,\nsolange du hier\nweitergehst.")
    };
    LeftText->SetText(FText::FromString(Left[Page]));
    RightText->SetText(FText::FromString(Right[Page]));
}

void AASHBOUNDGrimoire::Study()
{
    if (!bOpen)
    {
        bOpen = true;
        bStudied = true;
        Page = 0;
        ShowPage();
        SetActorTickEnabled(true);
        if (APlayerController* Player = UGameplayStatics::GetPlayerController(this, 0))
        {
            Player->SetViewTargetWithBlend(this, 0.45f);
        }
        UE_LOG(LogTemp, Display, TEXT("ASHBOUND grimoire opened; resonance and reweave changed"));
        if (GEngine) GEngine->AddOnScreenDebugMessage(-1, 5.0f, FColor(156, 230, 255),
            TEXT("Das Buch antwortet. Resonanz hält länger; Neufassung bleibt."));
    }
    else
    {
        if (Page == 2) StopReading();
        else
        {
            ++Page;
            ShowPage();
            UE_LOG(LogTemp, Display, TEXT("ASHBOUND grimoire page %d"), Page + 1);
        }
    }
}

void AASHBOUNDGrimoire::StopReading()
{
    if (!bOpen) return;
    bOpen = false;
    OpenAmount = 0;
    SetActorTickEnabled(false);
    ClosedBook->SetVisibility(true);
    LeftCover->SetVisibility(false);
    RightCover->SetVisibility(false);
    LeftPage->SetVisibility(false);
    RightPage->SetVisibility(false);
    LeftText->SetVisibility(false);
    RightText->SetVisibility(false);
    ReadingLight->SetVisibility(false);
    if (APlayerController* Player = UGameplayStatics::GetPlayerController(this, 0))
    {
        if (Player->GetPawn()) Player->SetViewTargetWithBlend(Player->GetPawn(), 0.4f);
    }
    UE_LOG(LogTemp, Display, TEXT("ASHBOUND grimoire closed; learned spell effects retained"));
}

void AASHBOUNDGrimoire::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);
    OpenAmount = FMath::Min(1.0f, OpenAmount + DeltaSeconds * 1.5f);
    const float Spread = 18.0f * OpenAmount;
    LeftCover->SetRelativeLocation(FVector(0, -Spread, -2));
    RightCover->SetRelativeLocation(FVector(0, Spread, -2));
    LeftPage->SetRelativeLocation(FVector(0, -Spread, 1));
    RightPage->SetRelativeLocation(FVector(0, Spread, 1));
    LeftText->SetRelativeLocation(FVector(25, -Spread - 15, 3));
    RightText->SetRelativeLocation(FVector(25, Spread - 15, 3));
    if (OpenAmount >= 0.35f)
    {
        ClosedBook->SetVisibility(false);
        LeftCover->SetVisibility(true);
        RightCover->SetVisibility(true);
        LeftPage->SetVisibility(true);
        RightPage->SetVisibility(true);
        LeftText->SetVisibility(true);
        RightText->SetVisibility(true);
        ReadingLight->SetVisibility(true);
    }
    if (OpenAmount >= 1.0f) SetActorTickEnabled(false);
}
