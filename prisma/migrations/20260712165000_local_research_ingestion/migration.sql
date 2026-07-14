-- CreateTable
CREATE TABLE "Market" (
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
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ScoreCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "weight" REAL NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MarketScore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "marketId" TEXT NOT NULL,
    "scoreCategoryId" TEXT NOT NULL,
    "score" REAL NOT NULL,
    "notes" TEXT,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MarketScore_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MarketScore_scoreCategoryId_fkey" FOREIGN KEY ("scoreCategoryId") REFERENCES "ScoreCategory" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ScoreHistory" (
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
    "reason" TEXT NOT NULL,
    "linkedClaimIds" TEXT NOT NULL,
    "linkedSourceIds" TEXT NOT NULL,
    "approvedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedBy" TEXT NOT NULL,
    CONSTRAINT "ScoreHistory_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ScoreHistory_scoreCategoryId_fkey" FOREIGN KEY ("scoreCategoryId") REFERENCES "ScoreCategory" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ScoreHistory_suggestedScoreChangeId_fkey" FOREIGN KEY ("suggestedScoreChangeId") REFERENCES "SuggestedScoreChange" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ResearchImport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "importId" TEXT NOT NULL,
    "importVersion" TEXT NOT NULL,
    "marketId" TEXT,
    "marketSlug" TEXT NOT NULL,
    "researchDate" DATETIME NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
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

-- CreateTable
CREATE TABLE "ResearchImportItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "researchImportId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "externalId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'needs_review',
    "payload" TEXT NOT NULL,
    "reviewerNote" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResearchImportItem_researchImportId_fkey" FOREIGN KEY ("researchImportId") REFERENCES "ResearchImport" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Claim" (
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
    "reviewedAt" DATETIME,
    "incorporatedAt" DATETIME,
    CONSTRAINT "Claim_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Claim_scoreCategoryId_fkey" FOREIGN KEY ("scoreCategoryId") REFERENCES "ScoreCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Claim_researchImportId_fkey" FOREIGN KEY ("researchImportId") REFERENCES "ResearchImport" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Source" (
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
    "reviewedAt" DATETIME,
    CONSTRAINT "Source_researchImportId_fkey" FOREIGN KEY ("researchImportId") REFERENCES "ResearchImport" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClaimSource" (
    "claimId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "relationType" TEXT NOT NULL,
    "relevance" REAL,
    "excerpt" TEXT,
    "notes" TEXT,

    PRIMARY KEY ("claimId", "sourceId"),
    CONSTRAINT "ClaimSource_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClaimSource_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClaimCompetitor" (
    "claimId" TEXT NOT NULL,
    "competitorId" TEXT NOT NULL,
    "relationType" TEXT,
    "notes" TEXT,

    PRIMARY KEY ("claimId", "competitorId"),
    CONSTRAINT "ClaimCompetitor_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClaimCompetitor_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "Competitor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Competitor" (
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
    "reviewedAt" DATETIME,
    CONSTRAINT "Competitor_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Competitor_researchImportId_fkey" FOREIGN KEY ("researchImportId") REFERENCES "ResearchImport" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Assumption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalId" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "researchImportId" TEXT,
    "statement" TEXT NOT NULL,
    "confidence" REAL,
    "status" TEXT NOT NULL DEFAULT 'needs_review',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" DATETIME,
    CONSTRAINT "Assumption_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Assumption_researchImportId_fkey" FOREIGN KEY ("researchImportId") REFERENCES "ResearchImport" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Risk" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalId" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "researchImportId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'needs_review',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" DATETIME,
    CONSTRAINT "Risk_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Risk_researchImportId_fkey" FOREIGN KEY ("researchImportId") REFERENCES "ResearchImport" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ResearchQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalId" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "researchImportId" TEXT,
    "question" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" DATETIME,
    CONSTRAINT "ResearchQuestion_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ResearchQuestion_researchImportId_fkey" FOREIGN KEY ("researchImportId") REFERENCES "ResearchImport" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SuggestedScoreChange" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalId" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "scoreCategoryId" TEXT NOT NULL,
    "researchImportId" TEXT,
    "currentScore" REAL NOT NULL,
    "suggestedScore" REAL NOT NULL,
    "reason" TEXT NOT NULL,
    "confidence" REAL NOT NULL,
    "supportingClaimIds" TEXT NOT NULL,
    "opposingClaimIds" TEXT NOT NULL,
    "sourceIds" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'needs_review',
    "reviewerNote" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SuggestedScoreChange_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SuggestedScoreChange_scoreCategoryId_fkey" FOREIGN KEY ("scoreCategoryId") REFERENCES "ScoreCategory" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SuggestedScoreChange_researchImportId_fkey" FOREIGN KEY ("researchImportId") REFERENCES "ResearchImport" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReportUpdate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalId" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "researchImportId" TEXT,
    "chapter" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "claimIds" TEXT NOT NULL,
    "sourceIds" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'needs_review',
    "reviewerNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" DATETIME,
    "acceptedAt" DATETIME,
    CONSTRAINT "ReportUpdate_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReportUpdate_researchImportId_fkey" FOREIGN KEY ("researchImportId") REFERENCES "ResearchImport" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TimelineEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "marketId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "linkedEntityType" TEXT,
    "linkedEntityId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL DEFAULT 'Local Researcher',
    CONSTRAINT "TimelineEvent_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Market_slug_key" ON "Market"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ScoreCategory_key_key" ON "ScoreCategory"("key");

-- CreateIndex
CREATE UNIQUE INDEX "MarketScore_marketId_scoreCategoryId_key" ON "MarketScore"("marketId", "scoreCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchImport_importId_key" ON "ResearchImport"("importId");

-- CreateIndex
CREATE UNIQUE INDEX "Claim_externalId_key" ON "Claim"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Source_externalId_key" ON "Source"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Competitor_slug_key" ON "Competitor"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ReportUpdate_externalId_key" ON "ReportUpdate"("externalId");
