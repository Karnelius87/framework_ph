import type { ProductDecisionStatus, ProductField, ProductStrategy } from "@/data/research";

const approvedStatuses = new Set(["approved", "validated"]);

export function approveProductStrategy(strategy: ProductStrategy): ProductStrategy {
  return {
    ...strategy,
    productDecisionStatus: "approved",
    productName: approveField(strategy.productName),
    businessModel: approveField(strategy.businessModel),
    idealCustomerProfile: approveField(strategy.idealCustomerProfile),
    primaryUser: approveField(strategy.primaryUser),
    coreProblem: approveField(strategy.coreProblem),
    productWedge: approveField(strategy.productWedge),
    coreWorkflow: approveField(strategy.coreWorkflow),
    keyProductAssumptions: approveField(strategy.keyProductAssumptions),
    productRisks: approveField(strategy.productRisks),
  };
}

export function approveCurrentProductAction(strategy: ProductStrategy, actionId: string): ProductStrategy {
  if (actionId === "approve-workshop-mvp-scope") return approveMvpScope(strategy);

  const currentIndex = strategy.productActions.findIndex((action) => action.id === actionId);
  if (currentIndex === -1) return strategy;

  const nextAction = strategy.productActions
    .slice(currentIndex + 1)
    .find((action) => !["completed", "rejected"].includes(action.status));
  const nextStage = stageForAction(nextAction?.id, strategy.currentProductStage);

  return {
    ...strategy,
    currentProductStage: nextStage.productStage,
    currentValidationStage: nextStage.validationStage,
    primaryBlocker: nextAction ? blockerForAction(nextAction.id, nextAction.blockedBy[0]) : "No current product blocker recorded.",
    productActions: strategy.productActions.map((action) => {
      if (action.id === actionId) return { ...action, status: "completed", isCurrentAction: false, blockedBy: [] };
      if (nextAction && action.id === nextAction.id) return { ...action, status: action.status === "hypothesis" ? "planned" : action.status, isCurrentAction: true };
      return { ...action, isCurrentAction: false };
    }),
    validationGates: updateGatesForCompletedAction(strategy.validationGates, actionId),
  };
}

export function pendingApprovalLabels(strategy: ProductStrategy) {
  const labels: string[] = [];
  if (!approvedStatuses.has(strategy.productDecisionStatus)) labels.push("Product strategy");

  const fields: Array<[string, ProductField<unknown>]> = [
    ["Product name", strategy.productName],
    ["Business model", strategy.businessModel],
    ["Ideal customer profile", strategy.idealCustomerProfile],
    ["Primary user", strategy.primaryUser],
    ["Core problem", strategy.coreProblem],
    ["Product wedge", strategy.productWedge],
    ["Core workflow", strategy.coreWorkflow],
    ["MVP objective", strategy.mvpObjective],
    ["MVP features", strategy.mvpFeatures],
    ["Not in MVP", strategy.notInMvp],
    ["MVP success criteria", strategy.mvpSuccessCriteria],
  ];

  for (const [label, field] of fields) {
    if (!approvedStatuses.has(field.status)) labels.push(label);
  }

  return labels;
}

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

function approveField<T>(field: ProductField<T>): ProductField<T> {
  return {
    ...field,
    status: "approved" as ProductDecisionStatus,
    reviewerNote: field.reviewerNote ?? "Approved in portal.",
    lastUpdated: new Date().toISOString().slice(0, 10),
  };
}

function stageForAction(actionId: string | undefined, fallback: ProductStrategy["currentProductStage"]) {
  if (actionId === "prepare-workshop-sales-pitch") return { productStage: "pitching" as const, validationStage: "Gate 3: Pitch Readiness" };
  if (actionId === "begin-workshop-outreach") return { productStage: "pitching" as const, validationStage: "Gate 4: Commercial Validation" };
  if (actionId === "secure-workshop-pilot") return { productStage: "pilot" as const, validationStage: "Gate 4: Commercial Validation" };
  if (actionId === "validate-workshop-usage") return { productStage: "pilot" as const, validationStage: "Gate 5: Product Validation" };
  if (actionId === "validate-supplier-economics") return { productStage: "product_validation" as const, validationStage: "Gate 6: Expansion Validation" };
  return { productStage: fallback, validationStage: "No active validation gate" };
}

function blockerForAction(actionId: string, fallback?: string) {
  if (actionId === "prepare-workshop-sales-pitch") return "Sales pitch and prospect list have not yet been prepared.";
  if (actionId === "begin-workshop-outreach") return "Commercial outreach has not started.";
  if (actionId === "secure-workshop-pilot") return "No committed pilot workshop yet.";
  if (actionId === "validate-workshop-usage") return "Pilot usage has not yet been validated.";
  if (actionId === "validate-supplier-economics") return "Supplier economics need real purchasing data.";
  return fallback ?? "Next product step is not complete.";
}

function updateGatesForCompletedAction(gates: ProductStrategy["validationGates"], actionId: string) {
  return gates.map((gate) => {
    if (actionId === "build-workshop-demo" && gate.id === "pitch-readiness") {
      return {
        ...gate,
        status: "current" as const,
        requirements: gate.requirements.map((requirement) => (
          requirement.label === "Pitchable demo" ? { ...requirement, status: "completed" as const } : requirement
        )),
      };
    }

    if (actionId === "prepare-workshop-sales-pitch" && gate.id === "pitch-readiness") {
      return {
        ...gate,
        status: "completed" as const,
        requirements: gate.requirements.map((requirement) => ({ ...requirement, status: "completed" as const })),
      };
    }

    if (actionId === "prepare-workshop-sales-pitch" && gate.id === "commercial-validation") {
      return { ...gate, status: "current" as const };
    }

    if (actionId === "secure-workshop-pilot" && gate.id === "product-validation") {
      return { ...gate, status: "current" as const };
    }

    if (actionId === "validate-workshop-usage" && gate.id === "product-validation") {
      return {
        ...gate,
        status: "completed" as const,
        requirements: gate.requirements.map((requirement) => ({ ...requirement, status: "completed" as const })),
      };
    }

    if (actionId === "validate-workshop-usage" && gate.id === "expansion-validation") {
      return { ...gate, status: "current" as const };
    }

    return gate;
  });
}
