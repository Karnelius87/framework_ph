-- CreateTable
CREATE TABLE "SavedGraphView" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "marketId" TEXT,
    "marketSlug" TEXT,
    "filters" TEXT NOT NULL DEFAULT '{}',
    "layout" TEXT NOT NULL DEFAULT 'hierarchical',
    "visibleNodeTypes" TEXT NOT NULL DEFAULT '[]',
    "pinnedNodes" TEXT NOT NULL DEFAULT '[]',
    "focusedNode" TEXT,
    "viewport" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SavedGraphView_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "SavedGraphView_marketId_idx" ON "SavedGraphView"("marketId");

-- CreateIndex
CREATE INDEX "SavedGraphView_marketSlug_idx" ON "SavedGraphView"("marketSlug");
