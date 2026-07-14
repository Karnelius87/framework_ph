CREATE TABLE "InvestmentCommitteeSnapshot" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "notes" TEXT,
  "includedMarkets" TEXT NOT NULL,
  "finalistSelection" TEXT NOT NULL,
  "rankings" TEXT NOT NULL,
  "frameworkVersion" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "RecommendationHistory" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "marketId" TEXT NOT NULL,
  "previousRecommendation" TEXT NOT NULL,
  "proposedRecommendation" TEXT NOT NULL,
  "rationale" TEXT NOT NULL,
  "linkedClaims" TEXT NOT NULL DEFAULT '[]',
  "linkedSources" TEXT NOT NULL DEFAULT '[]',
  "linkedScoreChanges" TEXT NOT NULL DEFAULT '[]',
  "linkedCriticalUnknowns" TEXT NOT NULL DEFAULT '[]',
  "linkedKillCriteria" TEXT NOT NULL DEFAULT '[]',
  "reviewerNote" TEXT,
  "approved" BOOLEAN NOT NULL DEFAULT false,
  "approvedBy" TEXT,
  "approvedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RecommendationHistory_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "DecisionReadiness" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "marketId" TEXT NOT NULL,
  "overallPercentage" REAL NOT NULL,
  "blockers" TEXT NOT NULL DEFAULT '[]',
  "missingValidation" TEXT NOT NULL DEFAULT '[]',
  "requiredActionBeforeBuild" TEXT NOT NULL,
  "updatedAt" DATETIME NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DecisionReadiness_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "DecisionReadinessItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "readinessId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "evidenceNote" TEXT,
  "requiredAction" TEXT,
  "updatedAt" DATETIME NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DecisionReadinessItem_readinessId_fkey" FOREIGN KEY ("readinessId") REFERENCES "DecisionReadiness" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "MarketLeadershipSubfactor" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "marketId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "score" REAL NOT NULL,
  "weight" REAL NOT NULL,
  "confidence" REAL NOT NULL,
  "linkedClaims" TEXT NOT NULL DEFAULT '[]',
  "linkedSources" TEXT NOT NULL DEFAULT '[]',
  "reviewerNote" TEXT,
  "lastUpdated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "MarketLeadershipSubfactor_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Scenario" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "marketId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "assumptions" TEXT NOT NULL DEFAULT '{}',
  "results" TEXT NOT NULL DEFAULT '{}',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Scenario_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ScenarioAdjustment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "scenarioId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "baseValue" REAL NOT NULL,
  "value" REAL NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ScenarioAdjustment_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "InvestmentMemoSummary" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "marketId" TEXT NOT NULL,
  "thesis" TEXT NOT NULL,
  "whyNow" TEXT NOT NULL,
  "whyThisMarket" TEXT NOT NULL,
  "whyWeCanWin" TEXT NOT NULL,
  "whyWeMayLose" TEXT NOT NULL,
  "topRisks" TEXT NOT NULL DEFAULT '[]',
  "criticalUnknowns" TEXT NOT NULL DEFAULT '[]',
  "killCriteria" TEXT NOT NULL DEFAULT '[]',
  "requiredValidation" TEXT NOT NULL DEFAULT '[]',
  "recommendedNextStep" TEXT NOT NULL,
  "currentRecommendation" TEXT NOT NULL,
  "recommendationConfidence" REAL NOT NULL,
  "updatedAt" DATETIME NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InvestmentMemoSummary_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "InvestmentCommitteeMeeting" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "sections" TEXT NOT NULL,
  "notes" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "RankingSnapshot" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "includedMarkets" TEXT NOT NULL,
  "marketScores" TEXT NOT NULL,
  "decisionScores" TEXT NOT NULL,
  "confidenceValues" TEXT NOT NULL,
  "recommendations" TEXT NOT NULL,
  "frameworkVersion" TEXT NOT NULL,
  "rankingOrder" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "RecommendationHistory_marketId_idx" ON "RecommendationHistory"("marketId");
CREATE UNIQUE INDEX "DecisionReadiness_marketId_key" ON "DecisionReadiness"("marketId");
CREATE UNIQUE INDEX "DecisionReadinessItem_readinessId_key_key" ON "DecisionReadinessItem"("readinessId", "key");
CREATE UNIQUE INDEX "MarketLeadershipSubfactor_marketId_key_key" ON "MarketLeadershipSubfactor"("marketId", "key");
CREATE INDEX "Scenario_marketId_idx" ON "Scenario"("marketId");
CREATE UNIQUE INDEX "ScenarioAdjustment_scenarioId_key_key" ON "ScenarioAdjustment"("scenarioId", "key");
CREATE UNIQUE INDEX "InvestmentMemoSummary_marketId_key" ON "InvestmentMemoSummary"("marketId");
