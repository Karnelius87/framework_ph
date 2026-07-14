import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";
import { coverageCategories, freshnessRules } from "../src/config/decision";
import { CURRENT_SCORING_FRAMEWORK_VERSION, PREVIOUS_SCORING_FRAMEWORK_VERSION, calculateWeightedMarketScore, scoringCategories, scoringWeightSnapshot } from "../src/config/scoring";
import { calculateDecisionScore, criticalUnknownPenalty, decisionScoreExplanation, killCriteriaPenalty } from "../src/lib/decision/calculations";
import { competitors, markets, sources } from "../src/data/research";
import { domainFromUrl, normalizeText, normalizeUrl } from "../src/lib/research/duplicates";
import { encodeJson } from "../src/lib/research/json";

const adapter = new PrismaBetterSqlite3({ url: "file:./data/local.db" });
const prisma = new PrismaClient({ adapter });

type SeedUnknown = { externalId: string; title: string; description: string; category: string; importance: string; currentConfidence: number; targetConfidence: number; status: string; validationMethod: string; impactIfWrong: string; recommendedAction: string };
type SeedKill = { externalId: string; title: string; description: string; threshold: string; category: string; status: string; severity: string; evidenceStatus: string; reviewerNote: string };
type SeedCoverage = { category: string; score: number; targetScore: number; evidenceCount: number; verifiedEvidenceCount: number; confidence: number; gaps: string; recommendedNextAction: string; freshnessStatus?: string };
type SeedAdvantage = { externalId: string; title: string; description: string; evidenceStatus: string; confidence: number; capabilityType: string; defensibility: string; timeHorizon: string };
type SeedAction = { externalId: string; title: string; description: string; priority: string; reason: string; linkedCoverageCategory?: string; estimatedImpact: number; expectedConfidenceImprovement: number; status: string };
type SeedDecision = { externalId: string; title: string; decision: string; rationale: string; previousValue?: string; newValue?: string; decisionType: string; reversible: boolean };

const demo = (value: string) => `Demo / Hypothesis - ${value}`;

async function main() {
  await clearDatabase();
  await seedScoringFramework();
  const categories = await prisma.scoreCategory.findMany();

  for (const rule of freshnessRules) {
    await prisma.freshnessRule.create({ data: rule });
  }

  for (const market of markets) {
    const weighted = calculateWeightedMarketScore(scoringCategories.map((category) => ({ key: category.key, score: market.framework[category.key] })));
    const created = await prisma.market.create({
      data: {
        slug: market.slug,
        name: market.name,
        status: market.status,
        score: weighted,
        confidence: market.confidence,
        completeness: market.completeness,
        chance: market.chance,
        recommendation: market.recommendation,
        stage: market.stage,
        lastVerifiedAt: new Date(),
        freshnessStatus: "current",
      },
    });

    for (const category of categories) {
      await prisma.marketScore.create({
        data: {
          marketId: created.id,
          scoreCategoryId: category.id,
          score: market.framework[category.key as keyof typeof market.framework],
          frameworkVersion: CURRENT_SCORING_FRAMEWORK_VERSION,
          freshnessStatus: "current",
          lastVerifiedAt: new Date(),
        },
      });
    }

    for (const event of market.timeline) {
      await prisma.timelineEvent.create({
        data: {
          marketId: created.id,
          type: event.type.toLowerCase().replace(/\s+/g, "_"),
          title: event.title,
          description: event.date,
        },
      });
    }
  }

  const marketBySlug = Object.fromEntries((await prisma.market.findMany()).map((market) => [market.slug, market]));

  for (const competitor of competitors) {
    const market = marketBySlug[competitor.linkedMarket];
    await prisma.competitor.create({
      data: {
        externalId: competitor.slug,
        slug: competitor.slug,
        company: competitor.company,
        normalizedName: normalizeText(competitor.company),
        logo: competitor.logo,
        website: competitor.website,
        domain: domainFromUrl(competitor.website),
        country: competitor.country,
        founded: competitor.founded,
        employees: competitor.employees,
        funding: competitor.funding,
        estimatedRevenue: competitor.revenue,
        estimatedCustomers: competitor.customers,
        pricing: competitor.pricing,
        targetSegment: competitor.targetSegment,
        strengths: encodeJson(competitor.strengths),
        weaknesses: encodeJson(competitor.weaknesses),
        threatLevel: competitor.threatLevel,
        marketId: market?.id,
        status: "verified",
        reviewedAt: new Date(),
        lastVerifiedAt: new Date(),
        freshnessStatus: "current",
      },
    });
  }

  for (const source of sources) {
    await prisma.source.create({
      data: {
        externalId: source.id,
        title: source.title,
        url: source.url,
        normalizedUrl: normalizeUrl(source.url),
        publisher: source.publisher,
        sourceType: "other",
        publishedAt: new Date(source.date),
        accessedAt: new Date(),
        evidenceLevel: source.evidenceLevel === "Primary" ? "A" : source.evidenceLevel === "Interview" ? "B" : "C",
        credibility: source.evidenceLevel === "Primary" ? 0.9 : source.evidenceLevel === "Interview" ? 0.75 : 0.55,
        notes: source.notes,
        status: "verified",
        reviewedAt: new Date(),
        lastVerifiedAt: new Date(source.date),
        freshnessStatus: "current",
      },
    });
  }

  await seedDecisionSystem(marketBySlug.workshop.id, {
    slug: "workshop",
    totalMarketScore: marketBySlug.workshop.score,
    confidence: 78,
    completeness: 82,
    customerValidation: 66,
    competitorCoverage: 72,
    founderFit: 82,
    executionReadiness: 64,
    chance: 31,
    coverage: [
      { category: "interviews", score: 10, targetScore: 85, evidenceCount: 1, verifiedEvidenceCount: 0, confidence: 20, gaps: demo("Interview count is far below the target for an investment-ready decision."), recommendedNextAction: "Interview 10 independent workshops." },
      { category: "product_adoption", score: 35, targetScore: 85, evidenceCount: 1, verifiedEvidenceCount: 0, confidence: 25, gaps: demo("Free workflow adoption is still unproven."), recommendedNextAction: "Approve the free Workshop MVP scope and build a pitchable demo." },
      { category: "pricing", score: 35, targetScore: 80, evidenceCount: 2, verifiedEvidenceCount: 1, confidence: 42, gaps: demo("Competitor and substitute pricing needs local verification."), recommendedNextAction: "Compare paid software, POS, and manual workaround costs." },
      { category: "customer_validation", score: 40, targetScore: 85, evidenceCount: 3, verifiedEvidenceCount: 1, confidence: 45, gaps: demo("Workflow pain is plausible but not yet quantified."), recommendedNextAction: "Run structured customer discovery calls." },
      { category: "competition", score: 60, targetScore: 85, evidenceCount: 4, verifiedEvidenceCount: 2, confidence: 58, gaps: demo("Local penetration of GarageBox and alternatives is unclear."), recommendedNextAction: "Verify GarageBox Philippines customer count." },
    ],
    unknowns: [
      { externalId: "workshop-unknown-active-count", title: "Number of active workshops in the Philippines", description: demo("The market denominator is still uncertain."), category: "market_structure", importance: "critical", currentConfidence: 35, targetConfidence: 80, status: "open", validationMethod: "DTI dataset plus map sampling", impactIfWrong: "Market size and go-to-market density may be overstated.", recommendedAction: "Estimate active workshop count using DTI and map data." },
      { externalId: "workshop-unknown-garagebox", title: "GarageBox market penetration", description: demo("Competitor penetration has not been independently verified."), category: "competition", importance: "high", currentConfidence: 40, targetConfidence: 75, status: "researching", validationMethod: "Customer interviews and public footprint review", impactIfWrong: "White-space score could be too high.", recommendedAction: "Verify GarageBox Philippines customer count." },
      { externalId: "workshop-unknown-wtp", title: "Willingness to pay PHP 1,500 per month", description: demo("Archived historical subscription-first SaaS assumption."), category: "willingness_to_pay", importance: "medium", currentConfidence: 25, targetConfidence: 80, status: "archived", validationMethod: "Archived - superseded business-model assumption", impactIfWrong: "No longer controls the Workshop thesis.", recommendedAction: "Archived - superseded business-model assumption." },
      { externalId: "workshop-unknown-demand-data", title: "Can free workflow usage produce reliable demand data?", description: demo("The free MVP must capture product categories, quantities, and repeat purchasing signals before supplier monetization can be validated."), category: "demand_data_quality", importance: "critical", currentConfidence: 20, targetConfidence: 80, status: "open", validationMethod: "Pilot usage instrumentation", impactIfWrong: "Supplier monetization may not be possible even if workflow adoption is strong.", recommendedAction: "Build demo and validate data capture in pilot workshops." },
    ],
    kills: [
      { externalId: "workshop-kill-penetration", title: "A competitor has more than 40% market penetration", description: demo("A dominant competitor would weaken the entry thesis."), threshold: ">40% verified penetration", category: "competition", status: "monitoring", severity: "high", evidenceStatus: "unverified", reviewerNote: "Requires local evidence before any recommendation change." },
      { externalId: "workshop-kill-wtp", title: "Average willingness to pay is below PHP 500 per month", description: demo("Archived historical subscription-first SaaS criterion."), threshold: "Archived - superseded business-model assumption", category: "pricing", status: "archived", severity: "archived", evidenceStatus: "hypothesis", reviewerNote: "Archived - the Workshop thesis changed from subscription-first SaaS to free workflow adoption with downstream supplier and transaction monetization." },
      { externalId: "workshop-kill-low-adoption", title: "Low Product Adoption", description: demo("Free adoption fails if onboarded workshops do not use the core workflow weekly."), threshold: "Fewer than 25% of onboarded pilot workshops use the core workflow weekly after 60 days.", category: "product_adoption", status: "monitoring", severity: "fatal", evidenceStatus: "hypothesis", reviewerNote: "Demo / Hypothesis. No automatic rejection; manual decision approval required." },
      { externalId: "workshop-kill-demand-data", title: "Insufficient Demand Data", description: demo("Supplier monetization needs reliable product category, quantity, and parts data."), threshold: "Workshops do not record product categories, quantities, or parts consistently enough to create reliable aggregated demand signals.", category: "demand_data_quality", status: "monitoring", severity: "high", evidenceStatus: "hypothesis", reviewerNote: "Demo / Hypothesis. No automatic rejection; manual decision approval required." },
      { externalId: "workshop-kill-transaction-conversion", title: "Low Transaction Conversion", description: demo("Demand signals must turn into supplier-attributed transaction intent."), threshold: "Fewer than 10% of active pilot workshops complete or explicitly commit to a portal-attributed supplier purchase during the validation period.", category: "transaction_conversion", status: "monitoring", severity: "high", evidenceStatus: "hypothesis", reviewerNote: "Demo / Hypothesis. No automatic rejection; manual decision approval required." },
      { externalId: "workshop-kill-no-supplier-monetization", title: "No Supplier Monetization", description: demo("Supplier economics must be commercially real before expansion is included in the case."), threshold: "None of three qualified suppliers offers a referral fee, rebate, campaign budget, differentiated quote tier, or transaction-based commercial model.", category: "supplier_monetization", status: "monitoring", severity: "high", evidenceStatus: "hypothesis", reviewerNote: "Demo / Hypothesis. No automatic rejection; manual decision approval required." },
      { externalId: "workshop-kill-negative-transaction-economics", title: "Negative Transaction Economics", description: demo("Supplier or resale margin must survive operational costs."), threshold: "Delivery, payment, support, returns, taxes, credit losses, and operational costs consume the available supplier or resale margin.", category: "transaction_economics", status: "monitoring", severity: "fatal", evidenceStatus: "hypothesis", reviewerNote: "Demo / Hypothesis. No automatic rejection; manual decision approval required." },
    ],
    advantages: [
      { externalId: "workshop-win-local-workflow", title: "Local workflow focus", description: demo("A narrow workshop operating system can fit Messenger-led daily behavior better than broad field-service tools."), evidenceStatus: "hypothesis", confidence: 68, capabilityType: "local_knowledge", defensibility: "moderate", timeHorizon: "near_term" },
      { externalId: "workshop-win-payments", title: "Payment confirmation wedge", description: demo("Repair status, invoice confirmation, and repeat reminders create a natural payments adjacency."), evidenceStatus: "hypothesis", confidence: 63, capabilityType: "product_design", defensibility: "moderate", timeHorizon: "near_term" },
      { externalId: "workshop-win-speed", title: "Fast MVP path", description: demo("The first workflow can be tested without full inventory or accounting depth."), evidenceStatus: "hypothesis", confidence: 72, capabilityType: "speed", defensibility: "weak", timeHorizon: "near_term" },
    ],
    disadvantages: [
      { externalId: "workshop-lose-inventory", title: "Inventory complexity", description: demo("Parts and oil inventory could pull the product into heavy operational scope."), evidenceStatus: "hypothesis", confidence: 59, capabilityType: "operational_advantage", defensibility: "weak", timeHorizon: "mid_term" },
      { externalId: "workshop-lose-adoption", title: "Technician adoption risk", description: demo("If frontline teams do not update job states, owner dashboards lose value."), evidenceStatus: "hypothesis", confidence: 61, capabilityType: "product_design", defensibility: "weak", timeHorizon: "near_term" },
      { externalId: "workshop-lose-sales", title: "Owner-led sales burden", description: demo("Dense local selling may be required before referrals compound."), evidenceStatus: "hypothesis", confidence: 54, capabilityType: "distribution", defensibility: "weak", timeHorizon: "near_term" },
    ],
    actions: [
      { externalId: "workshop-action-free-mvp-scope", title: "Approve the free Workshop MVP scope and build a pitchable demo", description: demo("Lock the free V1 workflow before outreach, pilots, or supplier economics."), priority: "critical", reason: "Current Workshop thesis depends on free workflow adoption and usable demand data, not subscription WTP.", linkedCoverageCategory: "product_adoption", estimatedImpact: 10, expectedConfidenceImprovement: 18, status: "planned" },
      { externalId: "workshop-action-interviews", title: "Interview 10 independent workshops", description: demo("Validate pain, workflow frequency, and free product adoption."), priority: "high", reason: "Workflow adoption is the primary validation path.", linkedCoverageCategory: "interviews", estimatedImpact: 9, expectedConfidenceImprovement: 18, status: "planned" },
      { externalId: "workshop-action-garagebox", title: "Verify GarageBox Philippines customer count", description: demo("Estimate whether a local competitor already owns the category."), priority: "high", reason: "Open critical unknown with high score impact.", linkedCoverageCategory: "competition", estimatedImpact: 7, expectedConfidenceImprovement: 10, status: "planned" },
      { externalId: "workshop-action-market-count", title: "Estimate active workshop count using DTI and map data", description: demo("Triangulate reachable business density by city."), priority: "high", reason: "Market denominator drives chance of becoming number one.", linkedCoverageCategory: "market_structure", estimatedImpact: 6, expectedConfidenceImprovement: 9, status: "planned" },
      { externalId: "workshop-action-wtp", title: "Validate willingness to pay", description: demo("Archived historical subscription-first price ladder."), priority: "low", reason: "Archived - superseded business-model assumption.", linkedCoverageCategory: "willingness_to_pay", estimatedImpact: 0, expectedConfidenceImprovement: 0, status: "dismissed" },
      { externalId: "workshop-action-supplier-margins", title: "Compare supplier margins for oil and parts", description: demo("Check whether supplier workflow or referrals can expand ACV."), priority: "medium", reason: "Potential expansion path and payment-flow proof point.", linkedCoverageCategory: "supplier_ecosystem", estimatedImpact: 4, expectedConfidenceImprovement: 6, status: "planned" },
    ],
    decisions: [
      { externalId: "workshop-decision-deep-research", title: "Workshop selected for deep research", decision: "Move Workshop into deep research", rationale: demo("High weighted score plus clear workflow wedge, pending WTP validation."), previousValue: "Mini Research", newValue: "Deep Research", decisionType: "market_status", reversible: true },
      { externalId: "workshop-decision-kill-wtp", title: "WTP kill criterion archived", decision: "Archive fatal WTP kill criterion", rationale: demo("The Workshop thesis changed from subscription-first SaaS to free workflow adoption with downstream supplier and transaction monetization."), previousValue: "WTP below PHP 500", newValue: "Archived - superseded business-model assumption", decisionType: "kill_criterion", reversible: true },
      { externalId: "workshop-decision-free-mvp", title: "Workshop free-first thesis approved for MVP scoping", decision: "Define and Build Free MVP", rationale: demo("The Workshop thesis changed from subscription-first SaaS to free workflow adoption with downstream supplier and transaction monetization."), previousValue: "Subscription-first SaaS validation", newValue: "Free workflow adoption with supplier and transaction monetization", decisionType: "product_direction", reversible: true },
    ],
  });

  await seedDecisionSystem(marketBySlug.beauty.id, {
    slug: "beauty",
    totalMarketScore: marketBySlug.beauty.score,
    confidence: 68,
    completeness: 61,
    customerValidation: 52,
    competitorCoverage: 58,
    founderFit: 70,
    executionReadiness: 66,
    chance: 18,
    coverage: [
      { category: "interviews", score: 18, targetScore: 85, evidenceCount: 1, verifiedEvidenceCount: 0, confidence: 24, gaps: demo("Interview sample is too small for a decision."), recommendedNextAction: "Interview salon owners across three price tiers." },
      { category: "pricing", score: 38, targetScore: 80, evidenceCount: 2, verifiedEvidenceCount: 1, confidence: 46, gaps: demo("Price ceiling and package expectations need testing."), recommendedNextAction: "Run salon pricing interviews." },
      { category: "competition", score: 50, targetScore: 85, evidenceCount: 3, verifiedEvidenceCount: 1, confidence: 55, gaps: demo("Local POS and booking alternatives need better coverage."), recommendedNextAction: "Map local salon software and POS substitutes." },
      { category: "customer_validation", score: 44, targetScore: 85, evidenceCount: 2, verifiedEvidenceCount: 0, confidence: 42, gaps: demo("Booking pain may not be enough to displace existing habits."), recommendedNextAction: "Validate repeat booking and no-show pain." },
      { category: "go_to_market", score: 42, targetScore: 80, evidenceCount: 1, verifiedEvidenceCount: 0, confidence: 39, gaps: demo("Acquisition channel is unclear."), recommendedNextAction: "Test salon community distribution channels." },
    ],
    unknowns: [
      { externalId: "beauty-unknown-paid-software", title: "Number of salons currently using paid software", description: demo("Paid software penetration is unclear."), category: "competition", importance: "high", currentConfidence: 35, targetConfidence: 75, status: "open", validationMethod: "Owner interviews and competitor footprint review", impactIfWrong: "Competition score and adoption assumptions may be wrong.", recommendedAction: "Ask salons which paid tools they use today." },
      { externalId: "beauty-unknown-wtp", title: "Willingness to pay for booking and reminders", description: demo("The value of booking automation needs local proof."), category: "pricing", importance: "critical", currentConfidence: 30, targetConfidence: 80, status: "open", validationMethod: "Price-test interviews", impactIfWrong: "Low WTP could make ACV too small.", recommendedAction: "Validate monthly WTP by salon size." },
      { externalId: "beauty-unknown-retention", title: "Retention impact from reminders", description: demo("CRM value is assumed but unmeasured."), category: "customer_workflow", importance: "medium", currentConfidence: 40, targetConfidence: 70, status: "researching", validationMethod: "Before/after booking reminder test", impactIfWrong: "Product wedge may be less urgent than expected.", recommendedAction: "Measure no-show and repeat-booking pain." },
    ],
    kills: [
      { externalId: "beauty-kill-crowded", title: "Dominant local booking/POS provider owns salon mindshare", description: demo("A strong local incumbent would reduce white space."), threshold: ">40% interviewed salons use same paid tool", category: "competition", status: "monitoring", severity: "high", evidenceStatus: "unverified", reviewerNote: "Investigate before investment-ready status." },
      { externalId: "beauty-kill-weekly", title: "Workflow is used less than weekly", description: demo("Low-frequency usage would weaken stickiness."), threshold: "Core workflow used less than weekly", category: "workflow", status: "safe", severity: "medium", evidenceStatus: "hypothesis", reviewerNote: "Current hypothesis is frequent booking usage, but needs validation." },
    ],
    advantages: [
      { externalId: "beauty-win-low-friction", title: "Low onboarding friction", description: demo("Booking and reminders can be tested with a lightweight product."), evidenceStatus: "hypothesis", confidence: 66, capabilityType: "speed", defensibility: "weak", timeHorizon: "near_term" },
      { externalId: "beauty-win-crm", title: "Repeat-customer CRM loop", description: demo("A reminder and loyalty loop may create retention value."), evidenceStatus: "hypothesis", confidence: 62, capabilityType: "product_design", defensibility: "moderate", timeHorizon: "mid_term" },
    ],
    disadvantages: [
      { externalId: "beauty-lose-crowded", title: "Crowded substitute set", description: demo("Booking tools, POS systems, and manual social channels overlap."), evidenceStatus: "hypothesis", confidence: 65, capabilityType: "distribution", defensibility: "weak", timeHorizon: "near_term" },
      { externalId: "beauty-lose-acv", title: "Lower ACV ceiling", description: demo("Small salons may not support a high monthly subscription."), evidenceStatus: "hypothesis", confidence: 58, capabilityType: "pricing_advantage", defensibility: "weak", timeHorizon: "near_term" },
      { externalId: "beauty-lose-differentiation", title: "Harder product differentiation", description: demo("Booking polish alone may not be enough to win."), evidenceStatus: "hypothesis", confidence: 55, capabilityType: "product_design", defensibility: "weak", timeHorizon: "mid_term" },
    ],
    actions: [
      { externalId: "beauty-action-interviews", title: "Interview salon owners across three price tiers", description: demo("Separate budget, premium, and chain salon workflows."), priority: "critical", reason: "Interview coverage is weakest.", linkedCoverageCategory: "interviews", estimatedImpact: 8, expectedConfidenceImprovement: 16, status: "planned" },
      { externalId: "beauty-action-pricing", title: "Validate salon willingness to pay", description: demo("Test WTP for booking, reminders, and lightweight POS."), priority: "high", reason: "Pricing is a core unknown.", linkedCoverageCategory: "pricing", estimatedImpact: 7, expectedConfidenceImprovement: 11, status: "planned" },
      { externalId: "beauty-action-competitors", title: "Map local salon software and POS substitutes", description: demo("Identify direct and indirect substitute tools."), priority: "high", reason: "Competitor coverage remains below target.", linkedCoverageCategory: "competition", estimatedImpact: 6, expectedConfidenceImprovement: 8, status: "planned" },
      { externalId: "beauty-action-no-show", title: "Measure no-show and repeat-booking pain", description: demo("Quantify whether reminders create enough ROI."), priority: "medium", reason: "Customer workflow value is unproven.", linkedCoverageCategory: "customer_validation", estimatedImpact: 5, expectedConfidenceImprovement: 8, status: "planned" },
      { externalId: "beauty-action-channel", title: "Test salon community distribution channels", description: demo("Check whether owner communities or suppliers can lower CAC."), priority: "medium", reason: "Go-to-market path is not yet clear.", linkedCoverageCategory: "go_to_market", estimatedImpact: 4, expectedConfidenceImprovement: 6, status: "planned" },
    ],
    decisions: [
      { externalId: "beauty-decision-deep-research", title: "Beauty moved to focused validation", decision: "Keep Beauty in deep research, not investment-ready", rationale: demo("Strong workflow frequency but pricing and competition need more proof."), previousValue: "Screening", newValue: "Deep Research", decisionType: "market_status", reversible: true },
      { externalId: "beauty-decision-pricing", title: "Pricing validation prioritized", decision: "Make WTP validation a top research priority", rationale: demo("Decision score is constrained by pricing uncertainty."), previousValue: "General research", newValue: "Pricing-first research", decisionType: "research_priority", reversible: true },
    ],
  });

  await seedCommitteeArtifacts(marketBySlug);
  await seedSavedGraphViews(marketBySlug);
}

async function clearDatabase() {
  await prisma.rankingSnapshot.deleteMany();
  await prisma.investmentCommitteeMeeting.deleteMany();
  await prisma.investmentCommitteeSnapshot.deleteMany();
  await prisma.scenarioAdjustment.deleteMany();
  await prisma.scenario.deleteMany();
  await prisma.investmentMemoSummary.deleteMany();
  await prisma.marketLeadershipSubfactor.deleteMany();
  await prisma.decisionReadinessItem.deleteMany();
  await prisma.decisionReadiness.deleteMany();
  await prisma.recommendationHistory.deleteMany();
  await prisma.savedGraphView.deleteMany();
  await prisma.intelligenceRelation.deleteMany();
  await prisma.decisionLog.deleteMany();
  await prisma.researchAction.deleteMany();
  await prisma.strategicDisadvantage.deleteMany();
  await prisma.strategicAdvantage.deleteMany();
  await prisma.killCriterion.deleteMany();
  await prisma.criticalUnknown.deleteMany();
  await prisma.researchCoverage.deleteMany();
  await prisma.decisionMetric.deleteMany();
  await prisma.researchPackageVersion.deleteMany();
  await prisma.founderFitMetric.deleteMany();
  await prisma.executionReadinessMetric.deleteMany();
  await prisma.marketLeadershipMetric.deleteMany();
  await prisma.freshnessRule.deleteMany();
  await prisma.claimSource.deleteMany();
  await prisma.claimCompetitor.deleteMany();
  await prisma.scoreHistory.deleteMany();
  await prisma.suggestedScoreChange.deleteMany();
  await prisma.reportUpdate.deleteMany();
  await prisma.researchQuestion.deleteMany();
  await prisma.risk.deleteMany();
  await prisma.assumption.deleteMany();
  await prisma.competitor.deleteMany();
  await prisma.source.deleteMany();
  await prisma.claim.deleteMany();
  await prisma.researchImportItem.deleteMany();
  await prisma.researchImport.deleteMany();
  await prisma.timelineEvent.deleteMany();
  await prisma.marketScore.deleteMany();
  await prisma.scoringFrameworkWeight.deleteMany();
  await prisma.scoringFramework.deleteMany();
  await prisma.scoreCategory.deleteMany();
  await prisma.market.deleteMany();
}

async function seedCommitteeArtifacts(marketBySlug: Record<string, { id: string; slug: string; name: string; score: number; confidence: number; completeness: number; chance: number; recommendation: string }>) {
  const marketRows = await prisma.market.findMany({
    include: {
      decisionMetric: true,
      criticalUnknowns: true,
      killCriteria: true,
      strategicAdvantages: true,
      strategicDisadvantages: true,
      researchActions: true,
    },
    orderBy: { score: "desc" },
  });

  for (const market of marketRows) {
    const source = markets.find((item) => item.slug === market.slug);
    const base = {
      marketScore: market.score,
      decisionScore: market.decisionMetric?.decisionScore ?? market.score,
      confidence: market.decisionMetric?.confidence ?? market.confidence,
      completeness: market.decisionMetric?.researchCompleteness ?? market.completeness,
      customerValidation: market.decisionMetric?.customerValidation ?? Math.max(30, market.completeness - 8),
      competitorCoverage: market.decisionMetric?.competitorCoverage ?? Math.max(30, market.completeness - 5),
      founderFit: market.decisionMetric?.founderFit ?? market.confidence,
      executionReadiness: market.decisionMetric?.executionReadiness ?? market.completeness,
      chance: market.decisionMetric?.chanceOfBecomingNumberOne ?? market.chance,
    };

    await seedReadiness(market.id, base);
    await seedLeadershipSubfactors(market.id, market.slug, base);
    await prisma.investmentMemoSummary.create({
      data: {
        marketId: market.id,
        thesis: demo(`${market.name} is ranked using current local research, score history, unknowns, and kill criteria.`),
        whyNow: demo("Operators still coordinate high-frequency workflows through chat, spreadsheets, and manual reconciliation."),
        whyThisMarket: demo(source?.summary ?? `${market.name} has a plausible vertical SaaS wedge.`),
        whyWeCanWin: demo(market.strategicAdvantages.map((item) => item.title).slice(0, 2).join("; ") || "A focused local workflow can beat broad tools."),
        whyWeMayLose: demo(market.strategicDisadvantages.map((item) => item.title).slice(0, 2).join("; ") || "The category may have weak willingness to pay."),
        topRisks: encodeJson(market.strategicDisadvantages.map((item) => item.title).slice(0, 4)),
        criticalUnknowns: encodeJson(market.criticalUnknowns.map((item) => item.title).slice(0, 5)),
        killCriteria: encodeJson(market.killCriteria.map((item) => `${item.title}: ${item.status}`)),
        requiredValidation: encodeJson(market.researchActions.map((item) => item.title).slice(0, 5)),
        recommendedNextStep: market.researchActions[0]?.title ?? demo("Add structured research actions before final decision."),
        currentRecommendation: market.recommendation,
        recommendationConfidence: base.confidence,
      },
    });

    const scenario = await prisma.scenario.create({
      data: {
        marketId: market.id,
        name: market.slug === "workshop" ? "Competitor Shock" : "Base Case",
        assumptions: encodeJson({
          label: demo("Local deterministic scenario"),
          marketScore: base.marketScore,
          confidence: base.confidence,
          customerValidation: base.customerValidation,
        }),
        results: encodeJson({
          marketScore: Math.max(0, base.marketScore - (market.slug === "workshop" ? 8 : 0)),
          decisionScore: Math.max(0, base.decisionScore - (market.slug === "workshop" ? 7 : 0)),
          recommendation: market.slug === "workshop" ? "Validate" : market.recommendation,
        }),
      },
    });

    for (const adjustment of [
      { key: "totalMarketScore", label: "Market Score", baseValue: base.marketScore, value: market.slug === "workshop" ? base.marketScore - 8 : base.marketScore },
      { key: "researchConfidence", label: "Research Confidence", baseValue: base.confidence, value: base.confidence },
      { key: "customerValidation", label: "Customer Validation", baseValue: base.customerValidation, value: market.slug === "beauty" ? base.customerValidation + 10 : base.customerValidation },
    ]) {
      await prisma.scenarioAdjustment.create({ data: { ...adjustment, scenarioId: scenario.id } });
    }
  }

  const workshop = marketBySlug.workshop;
  const beauty = marketBySlug.beauty;
  if (workshop) {
    await prisma.recommendationHistory.create({
      data: {
        marketId: workshop.id,
        previousRecommendation: "Validate",
        proposedRecommendation: "Build",
        rationale: demo("Workshop leads current ranking but WTP and competitor penetration still need committee review."),
        linkedClaims: encodeJson([]),
        linkedSources: encodeJson([]),
        linkedScoreChanges: encodeJson([]),
        linkedCriticalUnknowns: encodeJson([]),
        linkedKillCriteria: encodeJson([]),
        reviewerNote: "Seeded demo history for approval workflow.",
        approved: true,
        approvedBy: "Local Researcher",
        approvedAt: new Date(),
      },
    });
  }

  const ranked = marketRows
    .map((market) => ({
      slug: market.slug,
      name: market.name,
      marketScore: market.score,
      decisionScore: market.decisionMetric?.decisionScore ?? market.score,
      confidence: market.decisionMetric?.confidence ?? market.confidence,
      recommendation: market.recommendation,
      criticalUnknownCount: market.criticalUnknowns.length,
      hasTriggeredKill: market.killCriteria.some((criterion) => criterion.status === "triggered"),
    }))
    .sort((a, b) => b.decisionScore - a.decisionScore);

  await prisma.investmentCommitteeSnapshot.create({
    data: {
      title: "Seeded Committee Snapshot",
      notes: demo("Initial local snapshot for ranking-history demonstration."),
      includedMarkets: encodeJson(ranked.map((market) => market.slug)),
      finalistSelection: encodeJson([workshop?.slug, beauty?.slug].filter(Boolean)),
      rankings: encodeJson(ranked.map((market, index) => ({ rank: index + 1, ...market }))),
      frameworkVersion: CURRENT_SCORING_FRAMEWORK_VERSION,
    },
  });

  await prisma.rankingSnapshot.create({
    data: {
      includedMarkets: encodeJson(ranked.map((market) => market.slug)),
      marketScores: encodeJson(Object.fromEntries(ranked.map((market) => [market.slug, market.marketScore]))),
      decisionScores: encodeJson(Object.fromEntries(ranked.map((market) => [market.slug, market.decisionScore]))),
      confidenceValues: encodeJson(Object.fromEntries(ranked.map((market) => [market.slug, market.confidence]))),
      recommendations: encodeJson(Object.fromEntries(ranked.map((market) => [market.slug, market.recommendation]))),
      frameworkVersion: CURRENT_SCORING_FRAMEWORK_VERSION,
      rankingOrder: encodeJson(ranked.map((market) => market.slug)),
    },
  });

  await prisma.investmentCommitteeMeeting.create({
    data: {
      title: "Default Investment Committee Meeting",
      sections: encodeJson(["Portfolio overview", "Current ranking", "Finalists", "Critical unknowns", "Final recommendation", "Next action"]),
      notes: demo("Presentation route is generated from live local data."),
    },
  });
}

async function seedReadiness(marketId: string, base: { completeness: number; customerValidation: number; competitorCoverage: number; founderFit: number; executionReadiness: number }) {
  const readinessItems = [
    ["customer_interviews", "Minimum customer interviews completed", base.customerValidation],
    ["competitor_landscape", "Competitor landscape sufficiently mapped", base.competitorCoverage],
    ["willingness_to_pay", "Willingness to pay validated", base.customerValidation - 8],
    ["customer_workflow", "Customer workflow validated", base.completeness],
    ["market_count", "Market count estimated", base.completeness - 4],
    ["core_pain", "Core pain validated", base.customerValidation],
    ["mvp_scope", "MVP scope defined", base.executionReadiness],
    ["distribution", "Distribution strategy identified", base.founderFit - 5],
    ["kill_criteria", "Kill criteria reviewed", base.completeness],
    ["unknowns", "Critical unknowns below threshold", base.completeness - 10],
    ["founder_fit", "Founder fit assessed", base.founderFit],
    ["execution", "Execution readiness assessed", base.executionReadiness],
  ] as const;

  const status = (value: number) => value >= 85 ? "strong" : value >= 70 ? "sufficient" : value >= 55 ? "partial" : value >= 30 ? "weak" : "not_started";
  const readiness = await prisma.decisionReadiness.create({
    data: {
      marketId,
      overallPercentage: Math.round(readinessItems.reduce((sum, item) => sum + item[2], 0) / readinessItems.length),
      blockers: encodeJson(readinessItems.filter((item) => item[2] < 55).map((item) => item[1])),
      missingValidation: encodeJson(readinessItems.filter((item) => item[2] < 70).map((item) => demo(`Improve ${item[1].toLowerCase()}.`))),
      requiredActionBeforeBuild: demo(readinessItems.find((item) => item[2] < 70)?.[1] ?? "Ready for committee review."),
    },
  });

  for (const item of readinessItems) {
    await prisma.decisionReadinessItem.create({
      data: {
        readinessId: readiness.id,
        key: item[0],
        label: item[1],
        status: status(item[2]),
        evidenceNote: demo(`Current proxy score: ${Math.round(item[2])}.`),
        requiredAction: item[2] >= 70 ? undefined : demo(`Add evidence before Build decision.`),
      },
    });
  }
}

async function seedLeadershipSubfactors(marketId: string, slug: string, base: { chance: number; confidence: number; competitorCoverage: number; founderFit: number; executionReadiness: number }) {
  const subfactors = [
    ["competitive_intensity", "Competitive intensity", 100 - base.competitorCoverage, 12],
    ["incumbent_strength", "Incumbent strength", 100 - base.competitorCoverage + 5, 10],
    ["market_fragmentation", "Market fragmentation", slug === "workshop" ? 88 : slug === "beauty" ? 82 : 68, 12],
    ["localization_advantage", "Localization advantage", base.founderFit, 10],
    ["distribution_difficulty", "Distribution difficulty", 100 - base.executionReadiness, 8],
    ["switching_barriers", "Switching barriers", slug === "workshop" ? 72 : 58, 10],
    ["product_differentiation", "Product differentiation", base.chance + 35, 10],
    ["speed_advantage", "Speed advantage", base.executionReadiness, 8],
    ["capital_requirement", "Capital requirement", base.founderFit, 6],
    ["regulatory_barriers", "Regulatory barriers", base.executionReadiness, 4],
    ["customer_concentration", "Customer concentration", 70, 5],
    ["brand_dependence", "Brand dependence", 55, 5],
  ] as const;

  for (const item of subfactors) {
    await prisma.marketLeadershipSubfactor.create({
      data: {
        marketId,
        key: item[0],
        label: item[1],
        score: Math.max(0, Math.min(100, item[2])),
        weight: item[3],
        confidence: base.confidence,
        linkedClaims: encodeJson([]),
        linkedSources: encodeJson([]),
        reviewerNote: demo("Seeded leadership subfactor; replace with reviewed local research when available."),
      },
    });
  }
}

async function seedSavedGraphViews(marketBySlug: Record<string, { id: string; slug: string }>) {
  const views = [
    {
      name: "Workshop Competition Thesis",
      market: marketBySlug.workshop,
      layout: "competitor",
      filters: { competitorsOnly: true, confidenceThreshold: 0 },
      visibleNodeTypes: ["market", "competitor", "claim", "source", "interview", "score_category", "kill_criterion", "risk"],
      pinnedNodes: [],
    },
    {
      name: "Workshop Decision Trace",
      market: marketBySlug.workshop,
      layout: "decision",
      filters: { scoreImpactingOnly: true },
      visibleNodeTypes: ["market", "decision", "score_category", "claim", "source", "score_change", "critical_unknown", "kill_criterion", "research_action"],
      pinnedNodes: [],
    },
    {
      name: "Workshop Critical Unknowns",
      market: marketBySlug.workshop,
      layout: "decision",
      filters: { criticalOnly: true, unresolvedOnly: true },
      visibleNodeTypes: ["market", "critical_unknown", "research_action", "claim", "source", "decision"],
      pinnedNodes: [],
    },
    {
      name: "Beauty Competitor Risk Map",
      market: marketBySlug.beauty,
      layout: "competitor",
      filters: { competitorsOnly: true, unresolvedOnly: true },
      visibleNodeTypes: ["market", "competitor", "claim", "source", "risk", "kill_criterion", "critical_unknown"],
      pinnedNodes: [],
    },
  ];

  for (const view of views) {
    await prisma.savedGraphView.create({
      data: {
        name: view.name,
        marketId: view.market.id,
        marketSlug: view.market.slug,
        layout: view.layout,
        filters: encodeJson(view.filters),
        visibleNodeTypes: encodeJson(view.visibleNodeTypes),
        pinnedNodes: encodeJson(view.pinnedNodes),
        viewport: encodeJson({}),
      },
    });
  }
}

async function seedScoringFramework() {
  for (const [index, category] of scoringCategories.entries()) {
    await prisma.scoreCategory.create({
      data: {
        key: category.key,
        label: category.label,
        weight: category.weight,
        sortOrder: index + 1,
      },
    });
  }

  const framework = await prisma.scoringFramework.create({
    data: {
      version: CURRENT_SCORING_FRAMEWORK_VERSION,
      previousVersion: PREVIOUS_SCORING_FRAMEWORK_VERSION,
      label: "Investment scoring framework",
      active: true,
    },
  });

  const categories = await prisma.scoreCategory.findMany();
  for (const [index, category] of scoringCategories.entries()) {
    await prisma.scoringFrameworkWeight.create({
      data: {
        frameworkId: framework.id,
        scoreCategoryId: categories.find((item) => item.key === category.key)?.id,
        key: category.key,
        label: category.label,
        weight: category.weight,
        sortOrder: index + 1,
      },
    });
  }
}

async function seedDecisionSystem(marketId: string, input: {
  slug: string;
  totalMarketScore: number;
  confidence: number;
  completeness: number;
  customerValidation: number;
  competitorCoverage: number;
  founderFit: number;
  executionReadiness: number;
  chance: number;
  coverage: SeedCoverage[];
  unknowns: SeedUnknown[];
  kills: SeedKill[];
  advantages: SeedAdvantage[];
  disadvantages: SeedAdvantage[];
  actions: SeedAction[];
  decisions: SeedDecision[];
}) {
  const unknownIds: Record<string, string> = {};
  const killIds: Record<string, string> = {};

  for (const coverage of input.coverage) {
    const config = coverageCategories.find((category) => category.key === coverage.category);
    await prisma.researchCoverage.create({
      data: {
        marketId,
        category: coverage.category,
        label: config?.label ?? coverage.category,
        score: coverage.score,
        targetScore: coverage.targetScore,
        evidenceCount: coverage.evidenceCount,
        verifiedEvidenceCount: coverage.verifiedEvidenceCount,
        linkedClaimsCount: coverage.verifiedEvidenceCount,
        linkedSourcesCount: coverage.evidenceCount,
        linkedInterviewsCount: coverage.category === "interviews" ? coverage.evidenceCount : 0,
        confidence: coverage.confidence,
        gaps: coverage.gaps,
        recommendedNextAction: coverage.recommendedNextAction,
        freshnessStatus: coverage.freshnessStatus ?? "current",
      },
    });
  }

  for (const unknown of input.unknowns) {
    const created = await prisma.criticalUnknown.create({ data: { ...unknown, marketId } });
    unknownIds[unknown.externalId] = created.id;
    await relation(marketId, "Market", input.slug, "CriticalUnknown", created.id, "has_unknown", "hypothesis", unknown.currentConfidence / 100);
  }

  for (const criterion of input.kills) {
    const created = await prisma.killCriterion.create({ data: { ...criterion, marketId } });
    killIds[criterion.externalId] = created.id;
    await relation(marketId, "Market", input.slug, "KillCriterion", created.id, "has_kill_criterion", criterion.evidenceStatus, undefined);
  }

  for (const advantage of input.advantages) {
    const created = await prisma.strategicAdvantage.create({ data: { ...advantage, marketId } });
    await relation(marketId, "Market", input.slug, "StrategicAdvantage", created.id, "why_we_win", advantage.evidenceStatus, advantage.confidence / 100);
  }

  for (const disadvantage of input.disadvantages) {
    const created = await prisma.strategicDisadvantage.create({ data: { ...disadvantage, marketId } });
    await relation(marketId, "Market", input.slug, "StrategicDisadvantage", created.id, "why_we_may_lose", disadvantage.evidenceStatus, disadvantage.confidence / 100);
  }

  for (const action of input.actions) {
    await prisma.researchAction.create({
      data: {
        ...action,
        marketId,
        linkedUnknownId: action.title.includes("GarageBox") ? unknownIds[`${input.slug}-unknown-garagebox`] : action.title.includes("willingness") ? unknownIds[`${input.slug}-unknown-wtp`] : undefined,
        linkedKillCriterionId: action.title.includes("willingness") ? killIds[`${input.slug}-kill-wtp`] : undefined,
      },
    });
  }

  for (const decision of input.decisions) {
    const created = await prisma.decisionLog.create({
      data: {
        ...decision,
        marketId,
        approvedBy: "Local Researcher",
        linkedClaims: encodeJson([]),
        linkedSources: encodeJson([]),
        linkedScoreChanges: encodeJson([]),
        linkedRisks: encodeJson([]),
      },
    });
    await prisma.timelineEvent.create({
      data: {
        marketId,
        type: "decision",
        title: created.title,
        description: created.decision,
        linkedEntityType: "DecisionLog",
        linkedEntityId: created.id,
      },
    });
  }

  await prisma.founderFitMetric.create({
    data: {
      marketId,
      score: input.founderFit,
      domainKnowledge: input.slug === "workshop" ? 78 : 68,
      localAccess: input.slug === "workshop" ? 82 : 70,
      technicalCapability: 80,
      salesCapability: input.slug === "workshop" ? 76 : 66,
      distributionAccess: input.slug === "workshop" ? 74 : 64,
      capitalRequirementFit: input.slug === "workshop" ? 86 : 72,
      operationalFit: input.slug === "workshop" ? 82 : 70,
      explanation: demo("Manual founder-fit estimate used for decision scoring."),
    },
  });

  await prisma.executionReadinessMetric.create({
    data: {
      marketId,
      score: input.executionReadiness,
      customerAccess: input.slug === "workshop" ? 64 : 60,
      prototypeReadiness: 72,
      regulatoryReadiness: 78,
      dataAvailability: input.slug === "workshop" ? 58 : 54,
      integrationComplexity: input.slug === "workshop" ? 62 : 70,
      onboardingComplexity: input.slug === "workshop" ? 60 : 74,
      timeToMvp: input.slug === "workshop" ? 70 : 76,
      costToValidate: input.slug === "workshop" ? 68 : 72,
      explanation: demo("Manual execution-readiness estimate based on current research coverage."),
    },
  });

  await prisma.marketLeadershipMetric.create({
    data: {
      marketId,
      chance: input.chance,
      competitiveIntensity: input.slug === "workshop" ? 62 : 74,
      marketFragmentation: input.slug === "workshop" ? 90 : 86,
      incumbentStrength: input.slug === "workshop" ? 46 : 62,
      localizationAdvantage: input.slug === "workshop" ? 76 : 64,
      distributionDifficulty: input.slug === "workshop" ? 58 : 66,
      switchingBarriers: input.slug === "workshop" ? 61 : 44,
      speedAdvantage: input.slug === "workshop" ? 70 : 62,
      explanation: demo("Manual chance-of-becoming-number-one estimate."),
    },
  });

  const unknownPenalty = criticalUnknownPenalty(input.unknowns);
  const killPenalty = killCriteriaPenalty(input.kills);
  const decisionInput = {
    totalMarketScore: input.totalMarketScore,
    researchConfidence: input.confidence,
    researchCompleteness: input.completeness,
    customerValidation: input.customerValidation,
    competitorCoverage: input.competitorCoverage,
    executionReadiness: input.executionReadiness,
    founderFit: input.founderFit,
    criticalUnknownPenalty: unknownPenalty,
    killCriteriaPenalty: killPenalty,
  };

  await prisma.decisionMetric.create({
    data: {
      marketId,
      totalMarketScore: input.totalMarketScore,
      decisionScore: calculateDecisionScore(decisionInput),
      confidence: input.confidence,
      researchCompleteness: input.completeness,
      customerValidation: input.customerValidation,
      competitorCoverage: input.competitorCoverage,
      executionReadiness: input.executionReadiness,
      founderFit: input.founderFit,
      chanceOfBecomingNumberOne: input.chance,
      criticalUnknownPenalty: unknownPenalty,
      killCriteriaPenalty: killPenalty,
      explanation: decisionScoreExplanation(decisionInput),
    },
  });

  for (const category of scoringWeightSnapshot()) {
    await relation(marketId, "Market", input.slug, "ScoreCategory", category.key, "scored_by", "verified", 1);
  }
}

async function relation(marketId: string, fromType: string, fromId: string, toType: string, toId: string, relationType: string, evidenceStatus: string, confidence?: number) {
  await prisma.intelligenceRelation.create({
    data: {
      marketId,
      fromType,
      fromId,
      toType,
      toId,
      relationType,
      evidenceStatus,
      confidence,
    },
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
