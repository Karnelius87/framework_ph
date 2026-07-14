-- CreateTable
CREATE TABLE "ScoringFramework" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "version" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "previousVersion" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ScoringFrameworkWeight" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "frameworkId" TEXT NOT NULL,
    "scoreCategoryId" TEXT,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "weight" REAL NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ScoringFrameworkWeight_frameworkId_fkey" FOREIGN KEY ("frameworkId") REFERENCES "ScoringFramework" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ScoringFrameworkWeight_scoreCategoryId_fkey" FOREIGN KEY ("scoreCategoryId") REFERENCES "ScoreCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DecisionMetric" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "marketId" TEXT NOT NULL,
    "totalMarketScore" REAL NOT NULL,
    "decisionScore" REAL NOT NULL,
    "confidence" REAL NOT NULL,
    "researchCompleteness" REAL NOT NULL,
    "customerValidation" REAL NOT NULL,
    "competitorCoverage" REAL NOT NULL,
    "executionReadiness" REAL NOT NULL,
    "founderFit" REAL NOT NULL,
    "chanceOfBecomingNumberOne" REAL NOT NULL,
    "criticalUnknownPenalty" REAL NOT NULL DEFAULT 0,
    "killCriteriaPenalty" REAL NOT NULL DEFAULT 0,
    "formulaVersion" TEXT NOT NULL DEFAULT '1.0',
    "explanation" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DecisionMetric_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ResearchCoverage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "marketId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "score" REAL NOT NULL,
    "targetScore" REAL NOT NULL,
    "evidenceCount" INTEGER NOT NULL DEFAULT 0,
    "verifiedEvidenceCount" INTEGER NOT NULL DEFAULT 0,
    "lastUpdated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "linkedClaimsCount" INTEGER NOT NULL DEFAULT 0,
    "linkedSourcesCount" INTEGER NOT NULL DEFAULT 0,
    "linkedInterviewsCount" INTEGER NOT NULL DEFAULT 0,
    "gaps" TEXT NOT NULL,
    "recommendedNextAction" TEXT NOT NULL,
    "confidence" REAL NOT NULL DEFAULT 0,
    "freshnessStatus" TEXT NOT NULL DEFAULT 'unknown',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ResearchCoverage_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CriticalUnknown" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalId" TEXT,
    "marketId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "importance" TEXT NOT NULL,
    "currentConfidence" REAL NOT NULL,
    "targetConfidence" REAL NOT NULL,
    "status" TEXT NOT NULL,
    "owner" TEXT,
    "dueDate" DATETIME,
    "validationMethod" TEXT NOT NULL,
    "impactIfWrong" TEXT NOT NULL,
    "recommendedAction" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CriticalUnknown_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KillCriterion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalId" TEXT,
    "marketId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "threshold" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "evidenceStatus" TEXT NOT NULL,
    "reviewerNote" TEXT,
    "triggeredAt" DATETIME,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "KillCriterion_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StrategicAdvantage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalId" TEXT,
    "marketId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidenceStatus" TEXT NOT NULL,
    "confidence" REAL NOT NULL,
    "capabilityType" TEXT NOT NULL,
    "defensibility" TEXT NOT NULL,
    "timeHorizon" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StrategicAdvantage_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StrategicDisadvantage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalId" TEXT,
    "marketId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidenceStatus" TEXT NOT NULL,
    "confidence" REAL NOT NULL,
    "capabilityType" TEXT NOT NULL,
    "defensibility" TEXT NOT NULL,
    "timeHorizon" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StrategicDisadvantage_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ResearchAction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalId" TEXT,
    "marketId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "linkedCoverageCategory" TEXT,
    "linkedUnknownId" TEXT,
    "linkedKillCriterionId" TEXT,
    "estimatedImpact" REAL NOT NULL,
    "expectedConfidenceImprovement" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "dueDate" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ResearchAction_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DecisionLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalId" TEXT,
    "marketId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "previousValue" TEXT,
    "newValue" TEXT,
    "decisionType" TEXT NOT NULL,
    "linkedClaims" TEXT NOT NULL DEFAULT '[]',
    "linkedSources" TEXT NOT NULL DEFAULT '[]',
    "linkedScoreChanges" TEXT NOT NULL DEFAULT '[]',
    "linkedRisks" TEXT NOT NULL DEFAULT '[]',
    "approvedBy" TEXT NOT NULL,
    "approvedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reversible" BOOLEAN NOT NULL DEFAULT true,
    "reviewDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DecisionLog_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IntelligenceRelation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "marketId" TEXT,
    "fromType" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toType" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "relationType" TEXT NOT NULL,
    "evidenceStatus" TEXT NOT NULL DEFAULT 'hypothesis',
    "confidence" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IntelligenceRelation_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ResearchPackageVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "researchImportId" TEXT,
    "marketId" TEXT,
    "packageKey" TEXT NOT NULL,
    "sequenceNumber" INTEGER NOT NULL,
    "version" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "researcher" TEXT NOT NULL,
    "researchDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResearchPackageVersion_researchImportId_fkey" FOREIGN KEY ("researchImportId") REFERENCES "ResearchImport" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ResearchPackageVersion_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FounderFitMetric" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "marketId" TEXT NOT NULL,
    "score" REAL NOT NULL,
    "domainKnowledge" REAL NOT NULL,
    "localAccess" REAL NOT NULL,
    "technicalCapability" REAL NOT NULL,
    "salesCapability" REAL NOT NULL,
    "distributionAccess" REAL NOT NULL,
    "capitalRequirementFit" REAL NOT NULL,
    "operationalFit" REAL NOT NULL,
    "explanation" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FounderFitMetric_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExecutionReadinessMetric" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "marketId" TEXT NOT NULL,
    "score" REAL NOT NULL,
    "customerAccess" REAL NOT NULL,
    "prototypeReadiness" REAL NOT NULL,
    "regulatoryReadiness" REAL NOT NULL,
    "dataAvailability" REAL NOT NULL,
    "integrationComplexity" REAL NOT NULL,
    "onboardingComplexity" REAL NOT NULL,
    "timeToMvp" REAL NOT NULL,
    "costToValidate" REAL NOT NULL,
    "explanation" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExecutionReadinessMetric_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MarketLeadershipMetric" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "marketId" TEXT NOT NULL,
    "chance" REAL NOT NULL,
    "competitiveIntensity" REAL NOT NULL,
    "marketFragmentation" REAL NOT NULL,
    "incumbentStrength" REAL NOT NULL,
    "localizationAdvantage" REAL NOT NULL,
    "distributionDifficulty" REAL NOT NULL,
    "switchingBarriers" REAL NOT NULL,
    "speedAdvantage" REAL NOT NULL,
    "explanation" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MarketLeadershipMetric_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FreshnessRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "staleAfterDays" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Claim" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalId" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "scoreCategoryId" TEXT,
    "researchImportId" TEXT,
    "direction" TEXT NOT NULL,
    "confidence" REAL NOT NULL,
    "importance" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "scoreImpact" REAL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastVerifiedAt" DATETIME,
    "freshnessStatus" TEXT NOT NULL DEFAULT 'unknown',
    "reviewedAt" DATETIME,
    "incorporatedAt" DATETIME,
    CONSTRAINT "Claim_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Claim_scoreCategoryId_fkey" FOREIGN KEY ("scoreCategoryId") REFERENCES "ScoreCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Claim_researchImportId_fkey" FOREIGN KEY ("researchImportId") REFERENCES "ResearchImport" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Claim" ("confidence", "createdAt", "direction", "externalId", "id", "importance", "incorporatedAt", "marketId", "notes", "researchImportId", "reviewedAt", "scoreCategoryId", "scoreImpact", "statement", "status") SELECT "confidence", "createdAt", "direction", "externalId", "id", "importance", "incorporatedAt", "marketId", "notes", "researchImportId", "reviewedAt", "scoreCategoryId", "scoreImpact", "statement", "status" FROM "Claim";
DROP TABLE "Claim";
ALTER TABLE "new_Claim" RENAME TO "Claim";
CREATE UNIQUE INDEX "Claim_externalId_key" ON "Claim"("externalId");
CREATE TABLE "new_Competitor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalId" TEXT,
    "slug" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "logo" TEXT,
    "website" TEXT NOT NULL,
    "domain" TEXT,
    "country" TEXT NOT NULL,
    "founded" TEXT,
    "employees" TEXT,
    "funding" TEXT,
    "estimatedRevenue" TEXT,
    "estimatedCustomers" TEXT,
    "pricing" TEXT,
    "targetSegment" TEXT NOT NULL,
    "strengths" TEXT NOT NULL,
    "weaknesses" TEXT NOT NULL,
    "threatLevel" TEXT NOT NULL,
    "marketId" TEXT,
    "researchImportId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'needs_review',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastVerifiedAt" DATETIME,
    "freshnessStatus" TEXT NOT NULL DEFAULT 'unknown',
    "reviewedAt" DATETIME,
    CONSTRAINT "Competitor_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Competitor_researchImportId_fkey" FOREIGN KEY ("researchImportId") REFERENCES "ResearchImport" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Competitor" ("company", "country", "createdAt", "domain", "employees", "estimatedCustomers", "estimatedRevenue", "externalId", "founded", "funding", "id", "logo", "marketId", "normalizedName", "pricing", "researchImportId", "reviewedAt", "slug", "status", "strengths", "targetSegment", "threatLevel", "weaknesses", "website") SELECT "company", "country", "createdAt", "domain", "employees", "estimatedCustomers", "estimatedRevenue", "externalId", "founded", "funding", "id", "logo", "marketId", "normalizedName", "pricing", "researchImportId", "reviewedAt", "slug", "status", "strengths", "targetSegment", "threatLevel", "weaknesses", "website" FROM "Competitor";
DROP TABLE "Competitor";
ALTER TABLE "new_Competitor" RENAME TO "Competitor";
CREATE UNIQUE INDEX "Competitor_slug_key" ON "Competitor"("slug");
CREATE TABLE "new_Market" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "score" REAL NOT NULL,
    "confidence" REAL NOT NULL,
    "completeness" REAL NOT NULL,
    "chance" REAL NOT NULL,
    "recommendation" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "lastVerifiedAt" DATETIME,
    "freshnessStatus" TEXT NOT NULL DEFAULT 'unknown',
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Market" ("chance", "completeness", "confidence", "createdAt", "id", "name", "recommendation", "score", "slug", "stage", "status", "updatedAt") SELECT "chance", "completeness", "confidence", "createdAt", "id", "name", "recommendation", "score", "slug", "stage", "status", "updatedAt" FROM "Market";
DROP TABLE "Market";
ALTER TABLE "new_Market" RENAME TO "Market";
CREATE UNIQUE INDEX "Market_slug_key" ON "Market"("slug");
CREATE TABLE "new_MarketScore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "marketId" TEXT NOT NULL,
    "scoreCategoryId" TEXT NOT NULL,
    "score" REAL NOT NULL,
    "notes" TEXT,
    "frameworkVersion" TEXT NOT NULL DEFAULT '2.0',
    "lastVerifiedAt" DATETIME,
    "freshnessStatus" TEXT NOT NULL DEFAULT 'unknown',
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MarketScore_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MarketScore_scoreCategoryId_fkey" FOREIGN KEY ("scoreCategoryId") REFERENCES "ScoreCategory" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_MarketScore" ("createdAt", "id", "marketId", "notes", "score", "scoreCategoryId", "updatedAt") SELECT "createdAt", "id", "marketId", "notes", "score", "scoreCategoryId", "updatedAt" FROM "MarketScore";
DROP TABLE "MarketScore";
ALTER TABLE "new_MarketScore" RENAME TO "MarketScore";
CREATE UNIQUE INDEX "MarketScore_marketId_scoreCategoryId_key" ON "MarketScore"("marketId", "scoreCategoryId");
CREATE TABLE "new_ResearchImport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "importId" TEXT NOT NULL,
    "importVersion" TEXT NOT NULL,
    "sequenceNumber" INTEGER,
    "packageKey" TEXT,
    "packageVersion" TEXT NOT NULL DEFAULT 'v1',
    "topic" TEXT NOT NULL DEFAULT 'other',
    "status" TEXT NOT NULL DEFAULT 'pending_review',
    "marketId" TEXT,
    "marketSlug" TEXT NOT NULL,
    "researchDate" DATETIME NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "executiveSummary" TEXT,
    "recommendation" TEXT,
    "recommendationConfidence" REAL,
    "researcher" TEXT NOT NULL,
    "reportMarkdown" TEXT,
    "importStatus" TEXT NOT NULL DEFAULT 'pending_review',
    "validationWarnings" TEXT NOT NULL,
    "duplicateWarnings" TEXT NOT NULL,
    "rawPackage" TEXT NOT NULL,
    "importedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ResearchImport_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ResearchImport" ("duplicateWarnings", "id", "importId", "importStatus", "importVersion", "importedAt", "marketId", "marketSlug", "rawPackage", "reportMarkdown", "researchDate", "researcher", "summary", "title", "updatedAt", "validationWarnings") SELECT "duplicateWarnings", "id", "importId", "importStatus", "importVersion", "importedAt", "marketId", "marketSlug", "rawPackage", "reportMarkdown", "researchDate", "researcher", "summary", "title", "updatedAt", "validationWarnings" FROM "ResearchImport";
DROP TABLE "ResearchImport";
ALTER TABLE "new_ResearchImport" RENAME TO "ResearchImport";
CREATE UNIQUE INDEX "ResearchImport_importId_key" ON "ResearchImport"("importId");
CREATE UNIQUE INDEX "ResearchImport_sequenceNumber_key" ON "ResearchImport"("sequenceNumber");
CREATE TABLE "new_ScoreHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "marketId" TEXT NOT NULL,
    "scoreCategoryId" TEXT NOT NULL,
    "suggestedScoreChangeId" TEXT,
    "previousScore" REAL NOT NULL,
    "newScore" REAL NOT NULL,
    "previousWeightedContribution" REAL NOT NULL,
    "newWeightedContribution" REAL NOT NULL,
    "totalScoreBefore" REAL NOT NULL,
    "totalScoreAfter" REAL NOT NULL,
    "frameworkVersion" TEXT NOT NULL DEFAULT '2.0',
    "weightSnapshot" TEXT NOT NULL DEFAULT '[]',
    "reason" TEXT NOT NULL,
    "linkedClaimIds" TEXT NOT NULL,
    "linkedSourceIds" TEXT NOT NULL,
    "approvedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedBy" TEXT NOT NULL,
    CONSTRAINT "ScoreHistory_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ScoreHistory_scoreCategoryId_fkey" FOREIGN KEY ("scoreCategoryId") REFERENCES "ScoreCategory" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ScoreHistory_suggestedScoreChangeId_fkey" FOREIGN KEY ("suggestedScoreChangeId") REFERENCES "SuggestedScoreChange" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ScoreHistory" ("approvedAt", "approvedBy", "id", "linkedClaimIds", "linkedSourceIds", "marketId", "newScore", "newWeightedContribution", "previousScore", "previousWeightedContribution", "reason", "scoreCategoryId", "suggestedScoreChangeId", "totalScoreAfter", "totalScoreBefore") SELECT "approvedAt", "approvedBy", "id", "linkedClaimIds", "linkedSourceIds", "marketId", "newScore", "newWeightedContribution", "previousScore", "previousWeightedContribution", "reason", "scoreCategoryId", "suggestedScoreChangeId", "totalScoreAfter", "totalScoreBefore" FROM "ScoreHistory";
DROP TABLE "ScoreHistory";
ALTER TABLE "new_ScoreHistory" RENAME TO "ScoreHistory";
CREATE TABLE "new_Source" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "normalizedUrl" TEXT NOT NULL,
    "publisher" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "publishedAt" DATETIME,
    "accessedAt" DATETIME NOT NULL,
    "evidenceLevel" TEXT NOT NULL,
    "credibility" REAL NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'needs_review',
    "researchImportId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastVerifiedAt" DATETIME,
    "freshnessStatus" TEXT NOT NULL DEFAULT 'unknown',
    "reviewedAt" DATETIME,
    CONSTRAINT "Source_researchImportId_fkey" FOREIGN KEY ("researchImportId") REFERENCES "ResearchImport" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Source" ("accessedAt", "createdAt", "credibility", "evidenceLevel", "externalId", "id", "normalizedUrl", "notes", "publishedAt", "publisher", "researchImportId", "reviewedAt", "sourceType", "status", "title", "url") SELECT "accessedAt", "createdAt", "credibility", "evidenceLevel", "externalId", "id", "normalizedUrl", "notes", "publishedAt", "publisher", "researchImportId", "reviewedAt", "sourceType", "status", "title", "url" FROM "Source";
DROP TABLE "Source";
ALTER TABLE "new_Source" RENAME TO "Source";
CREATE UNIQUE INDEX "Source_externalId_key" ON "Source"("externalId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ScoringFramework_version_key" ON "ScoringFramework"("version");

-- CreateIndex
CREATE UNIQUE INDEX "ScoringFrameworkWeight_frameworkId_key_key" ON "ScoringFrameworkWeight"("frameworkId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "DecisionMetric_marketId_key" ON "DecisionMetric"("marketId");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchCoverage_marketId_category_key" ON "ResearchCoverage"("marketId", "category");

-- CreateIndex
CREATE INDEX "IntelligenceRelation_marketId_idx" ON "IntelligenceRelation"("marketId");

-- CreateIndex
CREATE INDEX "IntelligenceRelation_fromType_fromId_idx" ON "IntelligenceRelation"("fromType", "fromId");

-- CreateIndex
CREATE INDEX "IntelligenceRelation_toType_toId_idx" ON "IntelligenceRelation"("toType", "toId");

-- CreateIndex
CREATE INDEX "ResearchPackageVersion_sequenceNumber_idx" ON "ResearchPackageVersion"("sequenceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchPackageVersion_packageKey_version_key" ON "ResearchPackageVersion"("packageKey", "version");

-- CreateIndex
CREATE UNIQUE INDEX "FounderFitMetric_marketId_key" ON "FounderFitMetric"("marketId");

-- CreateIndex
CREATE UNIQUE INDEX "ExecutionReadinessMetric_marketId_key" ON "ExecutionReadinessMetric"("marketId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketLeadershipMetric_marketId_key" ON "MarketLeadershipMetric"("marketId");

-- CreateIndex
CREATE UNIQUE INDEX "FreshnessRule_key_key" ON "FreshnessRule"("key");
