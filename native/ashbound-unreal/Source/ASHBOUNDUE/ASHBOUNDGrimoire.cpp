#include "ASHBOUNDGrimoire.h"
#include "ASHBOUNDBookMemory.h"

#include "Camera/CameraComponent.h"
#include "Components/PointLightComponent.h"
#include "Components/SceneComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/Engine.h"
#include "Engine/StaticMesh.h"
#include "Engine/Texture2D.h"
#include "GameFramework/PlayerController.h"
#include "Kismet/GameplayStatics.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "Materials/MaterialInterface.h"
#include "UObject/ConstructorHelpers.h"
#include "Misc/CommandLine.h"
#include "Misc/Parse.h"

namespace
{
const TCHAR* BookMemorySlot()
{
#if !UE_BUILD_SHIPPING
    if (FParse::Param(FCommandLine::Get(), TEXT("ashboundqabookmemory")))
    {
        static FString QaSlot;
        FString RunId;
        if (FParse::Value(FCommandLine::Get(), TEXT("ashboundqabookmemoryid="), RunId) &&
            RunId.Len() == 32)
        {
            bool bHex = true;
            for (TCHAR Digit : RunId)
            {
                if (!FChar::IsHexDigit(Digit)) { bHex = false; break; }
            }
            if (bHex)
            {
                QaSlot = TEXT("ASHBOUND_BookMemory_QA_") + RunId;
                return *QaSlot;
            }
        }
        return TEXT("ASHBOUND_BookMemory_QA");
    }
#endif
    return TEXT("ASHBOUND_BookMemory");
}
}

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
    Spine = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("Spine"));
    LeftStack = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("LeftStack"));
    RightStack = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("RightStack"));
    LeftPage = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("LeftPage"));
    RightPage = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("RightPage"));
    UStaticMeshComponent* Pieces[] = {LeftCover, RightCover, Spine, LeftStack, RightStack, LeftPage, RightPage};
    for (UStaticMeshComponent* Piece : Pieces)
    {
        Piece->SetupAttachment(BookRoot);
        Piece->SetCollisionEnabled(ECollisionEnabled::NoCollision);
        Piece->SetCastShadow(false);
        if (Cube.Succeeded()) Piece->SetStaticMesh(Cube.Object);
    }
    LeftCover->SetRelativeScale3D(FVector(0.69f, 0.36f, 0.025f));
    RightCover->SetRelativeScale3D(FVector(0.69f, 0.36f, 0.025f));
    Spine->SetRelativeScale3D(FVector(0.70f, 0.024f, 0.075f));
    Spine->SetRelativeLocation(FVector(0, 0, -1.3f));
    LeftStack->SetRelativeScale3D(FVector(0.63f, 0.32f, 0.040f));
    RightStack->SetRelativeScale3D(FVector(0.63f, 0.32f, 0.040f));
    LeftPage->SetRelativeScale3D(FVector(0.61f, 0.31f, 0.004f));
    RightPage->SetRelativeScale3D(FVector(0.61f, 0.31f, 0.004f));

    TurnPivot = CreateDefaultSubobject<USceneComponent>(TEXT("TurnPivot"));
    TurnPivot->SetupAttachment(BookRoot);
    TurnSheet = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("TurnSheet"));
    TurnSheet->SetupAttachment(TurnPivot);
    TurnSheet->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    TurnSheet->SetCastShadow(true);
    if (Cube.Succeeded()) TurnSheet->SetStaticMesh(Cube.Object);
    TurnSheet->SetRelativeScale3D(FVector(0.61f, 0.31f, 0.003f));
    TurnSheet->SetRelativeLocation(FVector(0, 16, 2.4f));
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
    if (UGameplayStatics::DoesSaveGameExist(BookMemorySlot(), 0))
    {
        const UASHBOUNDBookMemory* Memory = Cast<UASHBOUNDBookMemory>(
            UGameplayStatics::LoadGameFromSlot(BookMemorySlot(), 0));
        if (Memory)
        {
            bStudied = Memory->StudiedVolumes.Contains(VolumeIndex);
            UE_LOG(LogTemp, Display, TEXT("ASHBOUND_BOOK_MEMORY volume=%d restored=%d"),
                VolumeIndex, bStudied ? 1 : 0);
        }
        else
        {
            UE_LOG(LogTemp, Error, TEXT("ASHBOUND_BOOK_MEMORY unreadable; save preserved"));
        }
    }
    UMaterialInterface* Leather = LoadObject<UMaterialInterface>(nullptr,
        TEXT("/Game/ASHBOUND/Materials/M_VaultLeather.M_VaultLeather"));
    UMaterialInterface* Paper = LoadObject<UMaterialInterface>(nullptr,
        TEXT("/Game/ASHBOUND/Materials/M_VaultPaper.M_VaultPaper"));
    UMaterialInterface* PageMaterial = LoadObject<UMaterialInterface>(nullptr,
        TEXT("/Game/ASHBOUND/Books/M_BookPage.M_BookPage"));
    if (Leather)
    {
        LeftCover->SetMaterial(0, Leather);
        RightCover->SetMaterial(0, Leather);
        Spine->SetMaterial(0, Leather);
    }
    if (Paper)
    {
        LeftStack->SetMaterial(0, Paper);
        RightStack->SetMaterial(0, Paper);
    }
    if (PageMaterial)
    {
        LeftPageInk = LeftPage->CreateDynamicMaterialInstance(0, PageMaterial);
        RightPageInk = RightPage->CreateDynamicMaterialInstance(0, PageMaterial);
        TurnPageInk = TurnSheet->CreateDynamicMaterialInstance(0, PageMaterial);
    }
    else UE_LOG(LogTemp, Error, TEXT("ASHBOUND book page material missing"));
    LeftCover->SetVisibility(false);
    RightCover->SetVisibility(false);
    Spine->SetVisibility(false);
    LeftStack->SetVisibility(false);
    RightStack->SetVisibility(false);
    LeftPage->SetVisibility(false);
    RightPage->SetVisibility(false);
    TurnSheet->SetVisibility(false);
    ReadingLight->SetVisibility(false);
    const FVector CameraLocation = GetActorLocation() + FVector(-150, 0, 98);
    ReadingCamera->SetWorldLocation(CameraLocation);
    ReadingCamera->SetWorldRotation((GetActorLocation() - CameraLocation).Rotation());
    SetActorTickEnabled(false);
}

void AASHBOUNDGrimoire::ShowPage()
{
    if (!LeftPageInk || !RightPageInk) return;
    auto LoadPage = [this](int32 PageIndex) -> UTexture2D*
    {
        const FString Name = FString::Printf(TEXT("T_BookV%02dP%02d"), VolumeIndex, PageIndex);
        const FString Path = FString::Printf(TEXT("/Game/ASHBOUND/Books/%s.%s"), *Name, *Name);
        return LoadObject<UTexture2D>(nullptr, *Path);
    };
    UTexture2D* LeftTexture = LoadPage(Spread * 2);
    UTexture2D* RightTexture = LoadPage(Spread * 2 + 1);
    if (!LeftTexture || !RightTexture)
    {
        UE_LOG(LogTemp, Error, TEXT("ASHBOUND volume %d spread %d is missing its page art"), VolumeIndex, Spread);
        return;
    }
    LeftPageInk->SetTextureParameterValue(TEXT("PageTexture"), LeftTexture);
    RightPageInk->SetTextureParameterValue(TEXT("PageTexture"), RightTexture);
    UE_LOG(LogTemp, Display, TEXT("ASHBOUND volume %d spread %d ready"), VolumeIndex, Spread + 1);
}

void AASHBOUNDGrimoire::Study()
{
    if (!bOpen)
    {
        bOpen = true;
        if (!bStudied)
        {
            UASHBOUNDBookMemory* Memory = nullptr;
            if (UGameplayStatics::DoesSaveGameExist(BookMemorySlot(), 0))
            {
                Memory = Cast<UASHBOUNDBookMemory>(
                    UGameplayStatics::LoadGameFromSlot(BookMemorySlot(), 0));
            }
            else
            {
                Memory = Cast<UASHBOUNDBookMemory>(
                    UGameplayStatics::CreateSaveGameObject(UASHBOUNDBookMemory::StaticClass()));
            }
            if (Memory)
            {
                Memory->StudiedVolumes.AddUnique(VolumeIndex);
                if (UGameplayStatics::SaveGameToSlot(Memory, BookMemorySlot(), 0))
                {
                    UE_LOG(LogTemp, Display, TEXT("ASHBOUND_BOOK_MEMORY volume=%d saved=1"), VolumeIndex);
                }
                else
                {
                    UE_LOG(LogTemp, Error, TEXT("ASHBOUND_BOOK_MEMORY volume=%d save failed"), VolumeIndex);
                }
            }
            else
            {
                UE_LOG(LogTemp, Error, TEXT("ASHBOUND_BOOK_MEMORY volume=%d unreadable; save preserved"), VolumeIndex);
            }
            bStudied = true;
        }
        Spread = 0;
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
        if (bTurning) return;
        if (Spread == 1) StopReading();
        else
        {
            bTurning = true;
            bSwapped = false;
            TurnAmount = 0.0f;
            TurnPivot->SetRelativeRotation(FRotator::ZeroRotator);
            if (TurnPageInk)
            {
                const FString Name = FString::Printf(TEXT("T_BookV%02dP01"), VolumeIndex);
                const FString Path = FString::Printf(TEXT("/Game/ASHBOUND/Books/%s.%s"), *Name, *Name);
                if (UTexture2D* Front = LoadObject<UTexture2D>(nullptr, *Path))
                    TurnPageInk->SetTextureParameterValue(TEXT("PageTexture"), Front);
            }
            TurnSheet->SetVisibility(true);
            RightPage->SetVisibility(false);
            SetActorTickEnabled(true);
            UE_LOG(LogTemp, Display, TEXT("ASHBOUND volume %d turning page"), VolumeIndex);
        }
    }
}

void AASHBOUNDGrimoire::StopReading()
{
    if (!bOpen) return;
    bOpen = false;
    OpenAmount = 0;
    bTurning = false;
    SetActorTickEnabled(false);
    ClosedBook->SetVisibility(true);
    LeftCover->SetVisibility(false);
    RightCover->SetVisibility(false);
    Spine->SetVisibility(false);
    LeftStack->SetVisibility(false);
    RightStack->SetVisibility(false);
    LeftPage->SetVisibility(false);
    RightPage->SetVisibility(false);
    TurnSheet->SetVisibility(false);
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
    const float SpreadOffset = 16.0f * OpenAmount;
    LeftCover->SetRelativeLocation(FVector(0, -SpreadOffset, -2));
    RightCover->SetRelativeLocation(FVector(0, SpreadOffset, -2));
    LeftStack->SetRelativeLocation(FVector(0, -SpreadOffset, -0.4f));
    RightStack->SetRelativeLocation(FVector(0, SpreadOffset, -0.4f));
    LeftPage->SetRelativeLocation(FVector(0, -SpreadOffset, 1.85f));
    RightPage->SetRelativeLocation(FVector(0, SpreadOffset, 1.85f));
    if (OpenAmount >= 0.35f)
    {
        ClosedBook->SetVisibility(false);
        LeftCover->SetVisibility(true);
        RightCover->SetVisibility(true);
        Spine->SetVisibility(true);
        LeftStack->SetVisibility(true);
        RightStack->SetVisibility(true);
        LeftPage->SetVisibility(true);
        if (!bTurning) RightPage->SetVisibility(true);
        ReadingLight->SetVisibility(true);
    }
    if (bTurning)
    {
        TurnAmount = FMath::Min(1.0f, TurnAmount + DeltaSeconds / 0.82f);
        const float Eased = FMath::InterpEaseInOut(0.0f, 1.0f, TurnAmount, 2.0f);
        TurnPivot->SetRelativeRotation(FRotator(0, 0, 180.0f * Eased));
        if (TurnAmount >= 0.5f && !bSwapped)
        {
            Spread = 1;
            ShowPage();
            bSwapped = true;
        }
        if (TurnAmount >= 1.0f)
        {
            bTurning = false;
            TurnSheet->SetVisibility(false);
            RightPage->SetVisibility(true);
            UE_LOG(LogTemp, Display, TEXT("ASHBOUND volume %d spread 2 visible"), VolumeIndex);
        }
    }
    if (OpenAmount >= 1.0f && !bTurning) SetActorTickEnabled(false);
}
