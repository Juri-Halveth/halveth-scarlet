using UnrealBuildTool;

public class ASHBOUNDUE : ModuleRules
{
    public ASHBOUNDUE(ReadOnlyTargetRules Target) : base(Target)
    {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;
        PublicDependencyModuleNames.AddRange(new string[] { "Core", "CoreUObject", "Engine", "InputCore", "HTTP", "Json", "ProceduralMeshComponent" });
    }
}
