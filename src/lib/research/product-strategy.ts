import type { ProductStrategy } from "@/data/research";
import { decodeJson, encodeJson } from "@/lib/research/json";

type ProductStrategySnapshotLike = {
  rawStrategy: string;
  productName: string;
  businessModel: string;
  currentProductStage: string;
  currentValidationStage: string;
  idealCustomerProfile: string;
  primaryUser: string;
  coreProblem: string;
  productWedge: string;
  coreWorkflow: string;
  mvpObjective: string;
  mvpFeatures: string;
  notInMvp: string;
  mvpSuccessCriteria: string;
  v2Features: string;
  v3Features: string;
  longTermPlatformThesis: string;
  keyProductAssumptions: string;
  productRisks: string;
  productReadiness: number;
  pitchReadiness: number;
  commercialValidation: number;
  productValidation: number;
  expansionValidation: number;
  commercialMetricGroups: string;
  productDecisionStatus: string;
  buildRoadmap: string;
  validationGates: string;
  productActions: string;
  primaryBlocker: string;
  approvedAt: Date;
};

export function productStrategyFromSnapshot(snapshot: ProductStrategySnapshotLike): ProductStrategy {
  return decodeJson<ProductStrategy>(snapshot.rawStrategy, fallbackProductStrategy(snapshot));
}

export function productStrategySnapshotData(params: {
  marketId: string;
  researchImportId?: string | null;
  sourceImportItemId?: string | null;
  strategy: ProductStrategy;
  approvedBy?: string;
}) {
  const { marketId, researchImportId, sourceImportItemId, strategy, approvedBy = "Local Researcher" } = params;

  return {
    marketId,
    researchImportId,
    sourceImportItemId,
    productName: strategy.productName.value,
    businessModel: encodeJson(strategy.businessModel.value),
    currentProductStage: strategy.currentProductStage,
    currentValidationStage: strategy.currentValidationStage,
    idealCustomerProfile: strategy.idealCustomerProfile.value,
    primaryUser: strategy.primaryUser.value,
    coreProblem: strategy.coreProblem.value,
    productWedge: strategy.productWedge.value,
    coreWorkflow: encodeJson(strategy.coreWorkflow.value),
    mvpObjective: strategy.mvpObjective.value,
    mvpFeatures: encodeJson(strategy.mvpFeatures.value),
    notInMvp: encodeJson(strategy.notInMvp.value),
    mvpSuccessCriteria: encodeJson(strategy.mvpSuccessCriteria.value),
    v2Features: encodeJson(strategy.v2Features.value),
    v3Features: encodeJson(strategy.v3Features.value),
    longTermPlatformThesis: strategy.longTermPlatformThesis.value,
    keyProductAssumptions: encodeJson(strategy.keyProductAssumptions.value),
    productRisks: encodeJson(strategy.productRisks.value),
    productReadiness: strategy.productReadiness,
    pitchReadiness: strategy.pitchReadiness,
    commercialValidation: strategy.commercialValidation,
    productValidation: strategy.productValidation,
    expansionValidation: strategy.expansionValidation,
    commercialMetricGroups: encodeJson(strategy.commercialMetricGroups),
    productDecisionStatus: strategy.productDecisionStatus,
    buildRoadmap: encodeJson(strategy.buildRoadmap),
    validationGates: encodeJson(strategy.validationGates),
    productActions: encodeJson(strategy.productActions),
    primaryBlocker: strategy.primaryBlocker,
    rawStrategy: encodeJson(strategy),
    approvedBy,
    approvedAt: new Date(),
  };
}

function fallbackProductStrategy(snapshot: ProductStrategySnapshotLike): ProductStrategy {
  const lastUpdated = snapshot.approvedAt.toISOString().slice(0, 10);
  const field = <T,>(value: T) => ({
    value,
    status: snapshot.productDecisionStatus as ProductStrategy["productDecisionStatus"],
    confidence: 0,
    linkedClaims: [],
    linkedSources: [],
    linkedAssumptions: [],
    lastUpdated,
  });

  return {
    productName: field(snapshot.productName),
    businessModel: field(decodeJson<string[]>(snapshot.businessModel, [])),
    currentProductStage: snapshot.currentProductStage as ProductStrategy["currentProductStage"],
    currentValidationStage: snapshot.currentValidationStage,
    idealCustomerProfile: field(snapshot.idealCustomerProfile),
    primaryUser: field(snapshot.primaryUser),
    coreProblem: field(snapshot.coreProblem),
    productWedge: field(snapshot.productWedge),
    coreWorkflow: field(decodeJson<string[]>(snapshot.coreWorkflow, [])),
    mvpObjective: field(snapshot.mvpObjective),
    mvpFeatures: field(decodeJson<string[]>(snapshot.mvpFeatures, [])),
    notInMvp: field(decodeJson<string[]>(snapshot.notInMvp, [])),
    mvpSuccessCriteria: field(decodeJson<string[]>(snapshot.mvpSuccessCriteria, [])),
    v2Features: field(decodeJson<string[]>(snapshot.v2Features, [])),
    v3Features: field(decodeJson<string[]>(snapshot.v3Features, [])),
    longTermPlatformThesis: field(snapshot.longTermPlatformThesis),
    keyProductAssumptions: field(decodeJson<string[]>(snapshot.keyProductAssumptions, [])),
    productRisks: field(decodeJson<string[]>(snapshot.productRisks, [])),
    productReadiness: snapshot.productReadiness,
    pitchReadiness: snapshot.pitchReadiness,
    commercialValidation: snapshot.commercialValidation,
    productValidation: snapshot.productValidation,
    expansionValidation: snapshot.expansionValidation,
    commercialMetricGroups: decodeJson<ProductStrategy["commercialMetricGroups"]>(snapshot.commercialMetricGroups, []),
    productDecisionStatus: snapshot.productDecisionStatus as ProductStrategy["productDecisionStatus"],
    buildRoadmap: decodeJson<ProductStrategy["buildRoadmap"]>(snapshot.buildRoadmap, []),
    validationGates: decodeJson<ProductStrategy["validationGates"]>(snapshot.validationGates, []),
    productActions: decodeJson<ProductStrategy["productActions"]>(snapshot.productActions, []),
    primaryBlocker: snapshot.primaryBlocker,
  };
}
