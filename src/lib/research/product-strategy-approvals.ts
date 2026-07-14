import type { ProductStrategy } from "@/data/research";

export function approveMvpScope(strategy: ProductStrategy): ProductStrategy {
  const approvedStrategy: ProductStrategy = {
    ...strategy,
    currentProductStage: "demo_build",
    currentValidationStage: "Gate 3: Pitch Readiness",
    productDecisionStatus: "approved",
    primaryBlocker: "Pitchable demo has not yet been built.",
    mvpObjective: { ...strategy.mvpObjective, status: "approved" },
    mvpFeatures: { ...strategy.mvpFeatures, status: "approved" },
    notInMvp: { ...strategy.notInMvp, status: "approved" },
    mvpSuccessCriteria: { ...strategy.mvpSuccessCriteria, status: "approved" },
    buildRoadmap: strategy.buildRoadmap.map((stage) => {
      if (stage.id === "mvp") return { ...stage, status: "approved" };
      return stage;
    }),
    validationGates: strategy.validationGates.map((gate) => {
      if (gate.id === "product-thesis") {
        return {
          ...gate,
          status: "completed",
          requirements: gate.requirements.map((requirement) => ({ ...requirement, status: "completed" })),
        };
      }

      if (gate.id === "pitch-readiness") {
        return {
          ...gate,
          status: "current",
          requirements: gate.requirements.map((requirement) => (
            requirement.label === "Pitchable demo" ? { ...requirement, status: "current" } : requirement
          )),
        };
      }

      return gate;
    }),
    productActions: strategy.productActions.map((action) => {
      if (action.id === "approve-workshop-mvp-scope") {
        return { ...action, status: "completed", isCurrentAction: false, blockedBy: [] };
      }

      if (action.id === "build-workshop-demo") {
        return { ...action, status: "planned", isCurrentAction: true, blockedBy: [] };
      }

      return { ...action, isCurrentAction: false };
    }),
  };

  return approvedStrategy;
}
