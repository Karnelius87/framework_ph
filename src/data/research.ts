import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  Building2,
  CheckCircle2,
  ClipboardList,
  Database,
  Landmark,
  LayoutDashboard,
  Map,
  Network,
  Settings,
} from "lucide-react";
import { calculateWeightedMarketScore, scoringCategories, type ScoreCategoryKey } from "@/config/scoring";

export type MarketSlug = "workshop" | "beauty" | "veterinary" | "construction" | "laundry" | "lpg";

export type FrameworkKey = ScoreCategoryKey;

export type ProductStage =
  | "market_research"
  | "product_thesis"
  | "mvp_scope"
  | "demo_build"
  | "pitching"
  | "pilot"
  | "product_validation"
  | "scale";

export type ProductDecisionStatus = "hypothesis" | "needs_review" | "approved" | "validated" | "disproven";

export type RoadmapStatus = "hypothesis" | "planned" | "approved" | "building" | "testing" | "completed" | "rejected";

export type ValidationGateStatus = "completed" | "current" | "blocked";

export type ProductActionPhase =
  | "market_uncertainty"
  | "icp"
  | "core_problem"
  | "product_wedge"
  | "mvp_scope"
  | "demo_build"
  | "sales_pitch"
  | "commercial_outreach"
  | "pilot"
  | "product_usage"
  | "v2"
  | "expansion_economics"
  | "supplier_marketplace_economics"
  | "scale";

export type ProductField<T = string> = {
  value: T;
  status: ProductDecisionStatus;
  confidence: number;
  linkedClaims?: string[];
  linkedSources?: string[];
  linkedAssumptions?: string[];
  reviewerNote?: string;
  lastUpdated: string;
};

export type BuildRoadmapStage = {
  id: "mvp" | "v2" | "v3" | "platform";
  label: string;
  objective: string;
  targetUser: string;
  keyFeatures: string[];
  dependencies: string[];
  validationRequired: string[];
  successCriteria: string[];
  status: RoadmapStatus;
  confidence: number;
};

export type ValidationGate = {
  id: string;
  label: string;
  status: ValidationGateStatus;
  requirements: { label: string; status: ValidationGateStatus }[];
  nextGate?: string;
};

export type ProductAction = {
  id: string;
  title: string;
  phase: ProductActionPhase;
  status: RoadmapStatus;
  dependsOn: string[];
  blockedBy: string[];
  unlocks: string[];
  isCurrentAction?: boolean;
  whyNow: string;
  whyNotLater: string;
  completionCriteria: string[];
};

export type CommercialMetricGroup = {
  title: string;
  metrics: string[];
};

export type ProductStrategy = {
  productName: ProductField;
  businessModel: ProductField<string[]>;
  currentProductStage: ProductStage;
  currentValidationStage: string;
  idealCustomerProfile: ProductField;
  primaryUser: ProductField;
  coreProblem: ProductField;
  productWedge: ProductField;
  coreWorkflow: ProductField<string[]>;
  mvpObjective: ProductField;
  mvpFeatures: ProductField<string[]>;
  notInMvp: ProductField<string[]>;
  mvpSuccessCriteria: ProductField<string[]>;
  v2Features: ProductField<string[]>;
  v3Features: ProductField<string[]>;
  longTermPlatformThesis: ProductField;
  keyProductAssumptions: ProductField<string[]>;
  productRisks: ProductField<string[]>;
  productReadiness: number;
  pitchReadiness: number;
  commercialValidation: number;
  productValidation: number;
  expansionValidation: number;
  commercialMetricGroups: CommercialMetricGroup[];
  productDecisionStatus: ProductDecisionStatus;
  buildRoadmap: BuildRoadmapStage[];
  validationGates: ValidationGate[];
  productActions: ProductAction[];
  primaryBlocker: string;
};

export type Market = {
  slug: MarketSlug;
  name: string;
  status: string;
  stage: string;
  score: number;
  chance: number;
  completeness: number;
  confidence: number;
  recommendation: string;
  tags: string[];
  updatedAt: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  framework: Record<FrameworkKey, number>;
  quality: {
    evidenceCoverage: number;
    customerValidation: number;
    competitorCoverage: number;
    sourceCount: number;
    overall: number;
  };
  history: { month: string; score: number; confidence: number }[];
  timeline: { date: string; type: string; title: string }[];
  chapters: Record<string, string>;
  productStrategy?: ProductStrategy;
  revenueMachine?: {
    title: string;
    status: string;
    confidence: number;
    thesis: string;
    operatingModel: string;
    example: {
      demand: string;
      supplierPrice: string;
      offerPrice: string;
      currentPrice: string;
      portalMargin: string;
      customerSavings: string;
    };
    levers: string[];
    validationQuestions: string[];
    risks: string[];
  };
};

const workshopTrace = {
  status: "needs_review" as ProductDecisionStatus,
  confidence: 62,
  linkedClaims: ["workshop-job-card-wedge", "workshop-owner-workflow-friction"],
  linkedSources: ["src-4"],
  linkedAssumptions: ["workshop-owners-will-use-simple-job-card"],
  reviewerNote: "Demo / hypothesis. Needs explicit MVP approval before demo build.",
  lastUpdated: "2026-07-14",
};

const workshopProductStrategy: ProductStrategy = {
  productName: {
    ...workshopTrace,
    value: "Free Workshop OS for independent automotive repair shops.",
  },
  businessModel: {
    ...workshopTrace,
    value: [
      "Free workflow product first",
      "Supplier affiliate fees",
      "Referral fees",
      "Supplier-funded promotions",
      "Transaction fees",
      "Aggregated and anonymized market insights",
      "Optional advanced Pro features",
      "Possible resale spread only after operational validation",
    ],
  },
  currentProductStage: "mvp_scope",
  currentValidationStage: "Gate 2: Product Thesis",
  idealCustomerProfile: {
    ...workshopTrace,
    value: "Independent Philippine automotive repair workshops with approximately 2-15 staff members that currently coordinate jobs through paper, spreadsheets, Facebook Messenger, phone calls, or generic POS tools.",
  },
  primaryUser: {
    ...workshopTrace,
    value: "Workshop owner or front-desk operator who controls intake, pricing, approval, invoice, and customer follow-up.",
  },
  coreProblem: {
    ...workshopTrace,
    value: "Customer, vehicle, requested work, parts, pricing, approval, job status, payment status, and service history are fragmented across Messenger, paper, spreadsheets, and generic POS tools.",
  },
  productWedge: {
    ...workshopTrace,
    value: "A free digital job-card and quotation workflow that captures every workshop transaction without forcing the owner to adopt a full ERP or paid subscription first.",
  },
  coreWorkflow: {
    ...workshopTrace,
    value: ["Customer and vehicle", "Job card", "Services and parts", "Editable pricing", "Quote", "Customer approval", "Work status", "Invoice", "Payment status", "Vehicle history"],
  },
  mvpObjective: {
    ...workshopTrace,
    value: "Allow a workshop to create and manage a customer job from vehicle intake through quote, approval, job status, payment status, and service history in a free workflow product.",
  },
  mvpFeatures: {
    ...workshopTrace,
    value: [
      "Customer record",
      "Vehicle record",
      "Digital job card",
      "Services and product line items",
      "Quantity",
      "Automatically calculated but editable price",
      "Quote",
      "Customer approval",
      "Job status",
      "Payment status",
      "Vehicle and service history",
      "Printable or shareable customer summary",
    ],
  },
  notInMvp: {
    ...workshopTrace,
    value: [
      "Full accounting",
      "Advanced inventory management",
      "AI pricing",
      "Supplier marketplace",
      "Automatic spare-parts matching",
      "Financing",
      "Insurance",
      "Advanced technician planning",
      "Full Facebook Messenger API integration",
      "Multi-branch enterprise functionality",
    ],
  },
  mvpSuccessCriteria: {
    ...workshopTrace,
    value: [
      "Owner can create a complete job in less than three minutes",
      "Every job has customer, vehicle, work, price, approval, and payment status",
      "Owner can retrieve previous vehicle history",
      "Product is clear enough to demonstrate during a sales pitch",
      "No mandatory setup meeting is required for basic usage",
      "Workshop can start with a simple service and price list or enter prices manually",
    ],
  },
  v2Features: {
    ...workshopTrace,
    confidence: 50,
    value: [
      "Technician assignment",
      "Before and after photos",
      "Service reminders",
      "Warranty tracking",
      "Basic inventory consumption",
      "Repeat-customer tools",
      "Workshop reporting",
      "Messenger-friendly status updates",
      "Staff roles",
      "Simple branch support",
    ],
  },
  v3Features: {
    ...workshopTrace,
    confidence: 35,
    value: [
      "Reorder signals",
      "Aggregated supplier demand",
      "Supplier quote requests",
      "Affiliate and referral fees",
      "Supplier-funded promotions",
      "Price benchmarking",
      "Negotiated procurement",
      "Possible resale spread after validation",
    ],
  },
  longTermPlatformThesis: {
    ...workshopTrace,
    confidence: 42,
    value: "Become the operating and commercial intelligence layer for independent Philippine workshops, beginning with jobs and payments and expanding later into procurement, supplier economics, benchmarking, financing, and related services.",
  },
  keyProductAssumptions: {
    ...workshopTrace,
    value: [
      "Owners will adopt a free job-card workflow before advanced inventory or supplier tools.",
      "A pitchable demo can explain the workflow without a setup meeting.",
      "Manual price entry is acceptable before supplier catalogs or AI pricing.",
      "Workshop transaction records are the prerequisite for later supplier economics.",
    ],
  },
  productRisks: {
    ...workshopTrace,
    value: [
      "Technicians may resist updating statuses unless owner workflow is simple.",
      "Inventory expectations may appear earlier than MVP scope supports.",
      "If the MVP feels like generic POS, the wedge may not be strong enough.",
      "Supplier revenue may distract from proving daily workflow usage.",
      "Free adoption can still fail if owners do not record product line items and quantities consistently.",
    ],
  },
  productReadiness: 55,
  pitchReadiness: 25,
  commercialValidation: 10,
  productValidation: 0,
  expansionValidation: 0,
  commercialMetricGroups: [
    {
      title: "Product Adoption",
      metrics: ["Workshops onboarded", "Weekly active workshops", "Jobs created per workshop", "Completed job workflows", "30-day retention", "60-day retention"],
    },
    {
      title: "Demand Data Quality",
      metrics: ["Jobs containing product line items", "Product categories recorded", "Quantities recorded", "Brand/specification completeness", "Repeat purchasing signals", "Percentage of jobs producing usable demand data"],
    },
    {
      title: "Transaction Conversion",
      metrics: ["Supplier links opened", "Quote requests", "First purchases", "Repeat purchases", "Portal-attributed purchase value", "Percentage of identified demand converted into transactions"],
    },
    {
      title: "Supplier Monetization",
      metrics: ["Suppliers contacted", "Suppliers interested", "Referral-fee offers", "Rebate offers", "Supplier-funded promotions", "Quote-tier improvements", "Revenue per active workshop", "Contribution margin per transaction"],
    },
  ],
  productDecisionStatus: "needs_review",
  primaryBlocker: "MVP scope has not yet been approved and demonstrated.",
  buildRoadmap: [
    {
      id: "mvp",
      label: "MVP / V1 - Free Workflow",
      objective: "Launch the free workflow wedge: customer, vehicle, job card, quote, approval, status, payment status, and service history.",
      targetUser: "Owner or front-desk operator",
      keyFeatures: ["Customer", "Vehicle", "Job card", "Services", "Product line items", "Quantities", "Editable prices", "Quote", "Approval", "Job status", "Payment status", "Service history"],
      dependencies: ["ICP accepted", "Core problem accepted", "MVP exclusions accepted"],
      validationRequired: ["Owner can create a complete job in under three minutes", "Demo is pitchable without onboarding"],
      successCriteria: ["MVP scope approved", "Pitchable demo built", "At least one workshop owner can follow the workflow"],
      status: "planned",
      confidence: 62,
    },
    {
      id: "v2",
      label: "V2 - Retention and Operations",
      objective: "Improve retention and operational depth once pilot owners use the core workflow.",
      targetUser: "Owner plus technicians",
      keyFeatures: ["Technician assignment", "Before and after photos", "Warranty tracking", "Reminders", "Staff roles", "Reports", "Simple product consumption", "Messenger-friendly customer updates"],
      dependencies: ["MVP demo", "Commercial outreach", "Pilot usage"],
      validationRequired: ["Repeat jobs completed", "Status updates used", "History retrieved during real jobs"],
      successCriteria: ["Repeat weekly usage", "Owner asks for operational upgrades", "Low setup burden"],
      status: "hypothesis",
      confidence: 50,
    },
    {
      id: "v3",
      label: "V3 - Supplier Monetization",
      objective: "Future Hypothesis - not included in the base case. Test supplier monetization only after workflow and demand data exist.",
      targetUser: "Owner buying recurring consumables",
      keyFeatures: ["Supplier links", "Quote requests", "Affiliate fees", "Referral fees", "Supplier-funded promotions", "Reorder recommendations", "Aggregated price benchmarking", "Demand intelligence", "Possible resale spread after validation"],
      dependencies: ["Active pilots", "Transactional data", "Real purchasing data"],
      validationRequired: ["Actual monthly consumable volumes", "Supplier quote tiers", "Portal-attributed purchase willingness"],
      successCriteria: ["Verified demand aggregation", "Supplier margin economics", "No heavy inventory risk"],
      status: "hypothesis",
      confidence: 35,
    },
    {
      id: "platform",
      label: "Platform - Commercial Intelligence",
      objective: "Future Hypothesis - not included in the base case. Turn workflow, payment, and purchasing data into a broader commercial intelligence layer.",
      targetUser: "Workshop owner, suppliers, finance and insurance partners",
      keyFeatures: ["Supplier marketplace", "Procurement benchmarking", "Financing referrals", "Insurance referrals", "Anonymous aggregated industry insights"],
      dependencies: ["Product validation", "Expansion validation", "Operational model"],
      validationRequired: ["Payment or commitment signals", "Supplier economics", "Partner economics"],
      successCriteria: ["Defensible usage data", "Repeat revenue beyond subscription", "Partner demand"],
      status: "hypothesis",
      confidence: 28,
    },
  ],
  validationGates: [
    {
      id: "market-thesis",
      label: "Gate 1: Market Thesis",
      status: "completed",
      nextGate: "Gate 2: Product Thesis",
      requirements: [
        { label: "Market structure assessed", status: "completed" },
        { label: "Competitors mapped", status: "completed" },
        { label: "Basic workflow assessed", status: "completed" },
      ],
    },
    {
      id: "product-thesis",
      label: "Gate 2: Product Thesis",
      status: "current",
      nextGate: "Gate 3: Pitch Readiness",
      requirements: [
        { label: "ICP defined", status: "completed" },
        { label: "Core problem defined", status: "completed" },
        { label: "Wedge defined", status: "completed" },
        { label: "MVP scope approved", status: "current" },
      ],
    },
    {
      id: "pitch-readiness",
      label: "Gate 3: Pitch Readiness",
      status: "blocked",
      nextGate: "Gate 4: Commercial Validation",
      requirements: [
        { label: "Pitchable demo", status: "blocked" },
        { label: "Pricing hypothesis", status: "blocked" },
        { label: "Sales material", status: "blocked" },
        { label: "Prospect list", status: "blocked" },
      ],
    },
    {
      id: "commercial-validation",
      label: "Gate 4: Commercial Validation",
      status: "blocked",
      nextGate: "Gate 5: Product Validation",
      requirements: [
        { label: "Outreach started", status: "blocked" },
        { label: "Responses measured", status: "blocked" },
        { label: "Demos completed", status: "blocked" },
        { label: "Pilot interest", status: "blocked" },
      ],
    },
    {
      id: "product-validation",
      label: "Gate 5: Product Validation",
      status: "blocked",
      nextGate: "Gate 6: Expansion Validation",
      requirements: [
        { label: "Active pilot", status: "blocked" },
        { label: "Repeat usage", status: "blocked" },
        { label: "Workflow completion", status: "blocked" },
        { label: "Payment or commitment signal", status: "blocked" },
      ],
    },
    {
      id: "expansion-validation",
      label: "Gate 6: Expansion Validation",
      status: "blocked",
      requirements: [
        { label: "Transactional data", status: "blocked" },
        { label: "Real purchasing data", status: "blocked" },
        { label: "Supplier quotes", status: "blocked" },
        { label: "Unit economics", status: "blocked" },
        { label: "Operational model", status: "blocked" },
      ],
    },
  ],
  productActions: [
    {
      id: "approve-workshop-mvp-scope",
      title: "Approve the free Workshop MVP scope and build a pitchable demo.",
      phase: "mvp_scope",
      status: "planned",
      dependsOn: ["ICP defined", "Core problem defined", "Product wedge defined"],
      blockedBy: ["MVP scope has not yet been approved and demonstrated"],
      unlocks: ["Build pitchable demo", "Prepare sales pitch"],
      isCurrentAction: true,
      whyNow: "The market thesis is now free workflow adoption first. Supplier economics cannot be validated properly until the MVP scope, demo, outreach, pilot usage, and demand data exist.",
      whyNotLater: "Without a scope decision, demo work, outreach, and supplier research will all be based on different assumptions.",
      completionCriteria: ["Free MVP features approved", "Not-in-MVP exclusions accepted", "Success criteria accepted", "Pitchable demo brief is clear"],
    },
    {
      id: "build-workshop-demo",
      title: "Build pitchable free job-card to customer-summary demo.",
      phase: "demo_build",
      status: "planned",
      dependsOn: ["approve-workshop-mvp-scope"],
      blockedBy: ["MVP scope not approved"],
      unlocks: ["Prepare sales pitch", "Start owner demos"],
      whyNow: "A concrete demo is required before asking owners for reliable commercial feedback.",
      whyNotLater: "Outreach without a demo would validate conversation quality more than product pull.",
      completionCriteria: ["Demo covers intake to payment status", "Product line items and quantities are visible", "Demo can be shown in under five minutes", "No setup meeting required for basic usage"],
    },
    {
      id: "prepare-workshop-sales-pitch",
      title: "Prepare sales pitch and prospect list.",
      phase: "sales_pitch",
      status: "hypothesis",
      dependsOn: ["build-workshop-demo"],
      blockedBy: ["No pitchable demo"],
      unlocks: ["Begin commercial outreach"],
      whyNow: "Pitch materials should translate the MVP into owner language before outreach starts.",
      whyNotLater: "Commercial outreach needs a consistent offer, price hypothesis, and target list.",
      completionCriteria: ["Pitch script for free workflow", "Free-first commercial thesis", "Prospect list", "Demo flow"],
    },
    {
      id: "begin-workshop-outreach",
      title: "Begin commercial outreach to independent workshops.",
      phase: "commercial_outreach",
      status: "hypothesis",
      dependsOn: ["prepare-workshop-sales-pitch"],
      blockedBy: ["No sales pitch", "No prospect list"],
      unlocks: ["Secure pilot"],
      whyNow: "Only outreach can test whether owners will give time, data, or commitment.",
      whyNotLater: "The market is not investable until commercial response is measured.",
      completionCriteria: ["Outreach started", "Responses measured", "Demos scheduled", "Objections captured"],
    },
    {
      id: "secure-workshop-pilot",
      title: "Secure first pilot workshop.",
      phase: "pilot",
      status: "hypothesis",
      dependsOn: ["begin-workshop-outreach"],
      blockedBy: ["No commercial outreach", "No committed pilot owner"],
      unlocks: ["Validate product usage"],
      whyNow: "Real workflow usage is needed before building V2 or supplier economics.",
      whyNotLater: "Without a pilot, later feature and revenue decisions remain speculative.",
      completionCriteria: ["One owner agrees to pilot", "Jobs entered", "Usage tracked", "Feedback loop defined"],
    },
    {
      id: "validate-workshop-usage",
      title: "Validate product usage in pilot.",
      phase: "product_usage",
      status: "hypothesis",
      dependsOn: ["secure-workshop-pilot"],
      blockedBy: ["No active pilot"],
      unlocks: ["Improve V2", "Measure purchasing data"],
      whyNow: "The product must earn repeat workflow usage before expansion revenue can matter.",
      whyNotLater: "Usage is the core proof that this can become the system of record.",
      completionCriteria: ["Repeat usage", "Workflow completion", "Owner retrieves history", "Payment or commitment signal"],
    },
    {
      id: "validate-supplier-economics",
      title: "Validate supplier or marketplace economics.",
      phase: "supplier_marketplace_economics",
      status: "hypothesis",
      dependsOn: ["validate-workshop-usage"],
      blockedBy: ["No transactional data", "No real purchasing data", "No supplier quotes"],
      unlocks: ["Future Revenue Machine", "Scale expansion case"],
      whyNow: "This belongs after workflow and purchasing data exist.",
      whyNotLater: "It should not block MVP decisions, but it becomes important once real demand can be aggregated.",
      completionCriteria: ["Monthly demand measured", "Supplier quote tiers obtained", "Portal-attributed purchase willingness tested", "Operational model documented"],
    },
  ],
};

export type Competitor = {
  slug: string;
  company: string;
  logo: string;
  website: string;
  country: string;
  founded: string;
  employees: string;
  funding: string;
  revenue: string;
  customers: string;
  pricing: string;
  targetSegment: string;
  strengths: string[];
  weaknesses: string[];
  threatLevel: "Low" | "Medium" | "High";
  features: Record<string, boolean>;
  linkedMarket: MarketSlug;
};

export type Source = {
  id: string;
  title: string;
  url: string;
  date: string;
  publisher: string;
  evidenceLevel: "Primary" | "Interview" | "Secondary" | "Anecdotal";
  notes: string;
  category: string;
  linkedMarket?: MarketSlug;
};

export type Note = {
  title: string;
  status: "Open" | "Verified" | "Rejected" | "Needs Validation";
  importance: "Low" | "Medium" | "High";
  tags: string[];
  linkedMarket: MarketSlug;
  linkedCompetitor?: string;
};

export const navItems: { title: string; href: string; icon: LucideIcon }[] = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Intelligence", href: "/intelligence", icon: Network },
  { title: "Markets", href: "/markets", icon: BarChart3 },
  { title: "Research", href: "/research", icon: BookOpen },
  { title: "Competitors", href: "/competitors", icon: Building2 },
  { title: "Sources", href: "/sources", icon: Database },
  { title: "Decisions", href: "/decisions", icon: ClipboardList },
  { title: "Investment Committee", href: "/investment-committee", icon: Landmark },
  { title: "Roadmap", href: "/roadmap", icon: Map },
  { title: "Settings", href: "/settings", icon: Settings },
];

export const frameworkWeights = scoringCategories;

const chapters = (name: string) => ({
  Overview: `### Why ${name}\nOperators are still coordinating bookings, collections, and customer updates across Messenger, spreadsheets, and paper ledgers. The opportunity is to own the daily operating rhythm before payments and financing attach.\n\n- High-frequency workflow\n- Fragmented small business base\n- Clear path from scheduling into payments`,
  Market: `### Market Structure\nThe buyer base is fragmented and locally operated. Decision cycles are short when the first workflow is painful enough, but retention depends on becoming the system of record for jobs, invoices, and customer follow-up.`,
  "Customer Research": `### Customer Signals\nInterview notes point to repeated manual reconciliation, weak visibility on job status, and owner dependence on chat threads. The strongest wedge is a mobile-first workflow that mirrors how teams already operate.`,
  Workflow: `### Core Workflow\nLead capture, job scheduling, technician or staff assignment, status updates, payment confirmation, and repeat customer reminders form the spine of the product.`,
  Competitors: `### Competitive Map\nHorizontal tools are too broad, while global vertical SaaS tools are priced and localized for mature markets. Local substitutes are usually chat, generic POS, or spreadsheets.`,
  Revenue: `### Revenue Model\nThe base thesis is free workflow adoption first. Monetization should come later from supplier affiliate fees, referral fees, supplier-funded promotions, transaction economics, aggregated anonymized insights, optional advanced Pro features, and possible resale spread only after operational validation.`,
  Expansion: `### Expansion Paths\nPayments, supplier ordering, embedded lending, customer loyalty, and benchmarking become credible after workflow adoption.`,
  Product: `### Product Thesis\nBuild the narrowest operating system that gives owners one live view of work, money, and customer follow-up from a phone.`,
  "Go To Market": `### GTM Motion\nStart with owner-led direct sales in dense metro clusters, convert with migration help, then use referral loops through suppliers and trade communities.`,
  Moat: `### Moat\nThe data moat comes from workflow history, pricing patterns, customer repeat behavior, and operational benchmarks across similar businesses.`,
  Risks: `### Risks\nBypass risk is real if the product only digitizes notes. The wedge must save time immediately and attach to payment confirmation or customer reminders.`,
  "Investment Decision": `### Decision\nProceed when interview density confirms urgent workflow pain, willingness to adopt a free product, usable demand data capture, and a repeatable migration motion from existing chat, paper, and spreadsheet habits.`,
  Sources: `### Evidence\nSources include operator interviews, desk research, public market statistics, competitor audits, pricing pages, and workflow screenshots.`,
});

export const markets: Market[] = [
  {
    slug: "workshop",
    name: "Workshop",
    status: "Deep Research",
    stage: "Investment Ready",
    score: 86,
    chance: 31,
    completeness: 82,
    confidence: 78,
    recommendation: "Define and Build Free MVP",
    tags: ["High stickiness", "Payments", "Messenger"],
    updatedAt: "Jul 8, 2026",
    summary: "Auto and repair workshops show the best mix of recurring workflow, fragmented operators, and payments adjacency.",
    strengths: ["Daily operational pain", "Clear payment moments", "Repeat customers"],
    weaknesses: ["Technician adoption", "Inventory complexity"],
    framework: { competition: 88, fragmentation: 92, stickiness: 91, expansion: 82, messenger_dependence: 86, payment_flow: 84, market_size: 76, bypass_risk: 69, data_moat: 74, network_effects: 48 },
    quality: { evidenceCoverage: 84, customerValidation: 78, competitorCoverage: 81, sourceCount: 38, overall: 82 },
    history: [{ month: "Jan", score: 72, confidence: 48 }, { month: "Feb", score: 77, confidence: 59 }, { month: "Mar", score: 81, confidence: 65 }, { month: "Apr", score: 84, confidence: 73 }, { month: "May", score: 86, confidence: 78 }],
    timeline: [{ date: "Jul 8", type: "Score", title: "Raised score after 9 workshop owner interviews" }, { date: "Jul 3", type: "Source", title: "Added mechanic supplier channel notes" }, { date: "Jun 25", type: "Competitor", title: "Mapped global field-service tools" }],
    chapters: chapters("Workshop"),
    productStrategy: workshopProductStrategy,
    revenueMachine: {
      title: "Free workflow wedge into supplier buying power",
      status: "Hypothesis - needs supplier validation",
      confidence: 35,
      thesis: "Start with a free workshop operating layer. Once enough workshops are onboarded, use structured demand signals for oil, filters, batteries, tires, and parts to monetize through supplier affiliate fees, referral fees, supplier-funded promotions, transaction economics, aggregated anonymized insights, optional advanced Pro features, and possible resale spread only after operational validation.",
      operatingModel: "The product earns trust by helping owners run jobs, payments, reminders, and inventory signals. That usage reveals recurring demand for oil, parts, tires, batteries, and consumables. Aggregated demand becomes the commercial asset.",
      example: {
        demand: "40,000 liters/month of motor oil demand",
        supplierPrice: "Negotiated supplier price: PHP 90/liter",
        offerPrice: "Portal offer to workshops: PHP 95-100/liter",
        currentPrice: "Typical workshop purchase price: PHP 120/liter",
        portalMargin: "Portal gross spread: PHP 5-10/liter",
        customerSavings: "Workshop saving: PHP 20-25/liter before delivery/service terms",
      },
      levers: [
        "Affiliate/referral fee for early supplier introductions",
        "Negotiated resale spread once demand volume is proven",
        "Supplier-funded promotions for high-frequency consumables",
        "Inventory reorder reminders that create repeat purchase intent",
        "Benchmark data showing owners where they overpay",
      ],
      validationQuestions: [
        "Do workshops actually buy enough recurring oil and parts through fragmented channels?",
        "Can the portal measure or infer demand accurately from workflow usage?",
        "Will suppliers quote materially better prices for aggregated monthly demand?",
        "Can delivery, credit terms, and returns be handled without operational drag?",
        "Will workshops trust the portal enough to buy through it?",
      ],
      risks: [
        "Commodity resale can become operationally heavy if we take inventory risk too early.",
        "Suppliers may require exclusivity, credit exposure, or minimum volumes.",
        "Workshops may use the quote to negotiate elsewhere unless the portal controls convenience, trust, or terms.",
      ],
    },
  },
  {
    slug: "beauty",
    name: "Beauty",
    status: "Mini Research",
    stage: "Deep Research",
    score: 77,
    chance: 18,
    completeness: 61,
    confidence: 68,
    recommendation: "Validate payments",
    tags: ["Bookings", "Repeat usage", "Consumer CRM"],
    updatedAt: "Jul 6, 2026",
    summary: "Beauty salons have strong booking and loyalty loops but more visible competition and lower workflow complexity.",
    strengths: ["Frequent bookings", "Customer retention hooks", "Low setup friction"],
    weaknesses: ["Crowded POS space", "Lower ACV"],
    framework: { competition: 66, fragmentation: 88, stickiness: 76, expansion: 72, messenger_dependence: 84, payment_flow: 73, market_size: 70, bypass_risk: 62, data_moat: 64, network_effects: 42 },
    quality: { evidenceCoverage: 62, customerValidation: 66, competitorCoverage: 58, sourceCount: 24, overall: 61 },
    history: [{ month: "Jan", score: 63, confidence: 41 }, { month: "Feb", score: 69, confidence: 51 }, { month: "Mar", score: 72, confidence: 60 }, { month: "Apr", score: 77, confidence: 68 }, { month: "May", score: 77, confidence: 68 }],
    timeline: [{ date: "Jul 6", type: "Source", title: "Added pricing audit for salon tools" }, { date: "Jun 30", type: "Research", title: "Completed 6 owner calls" }],
    chapters: chapters("Beauty"),
  },
  {
    slug: "veterinary",
    name: "Veterinary",
    status: "Screening",
    stage: "Mini Research",
    score: 74,
    chance: 14,
    completeness: 54,
    confidence: 64,
    recommendation: "Interview clinics",
    tags: ["Clinical records", "Appointments", "High trust"],
    updatedAt: "Jul 2, 2026",
    summary: "Veterinary clinics have deep workflow needs, but global incumbents and compliance expectations raise execution difficulty.",
    strengths: ["High workflow depth", "Records as moat", "Premium customer base"],
    weaknesses: ["Incumbent depth", "Migration burden"],
    framework: { competition: 58, fragmentation: 74, stickiness: 88, expansion: 78, messenger_dependence: 62, payment_flow: 66, market_size: 68, bypass_risk: 76, data_moat: 83, network_effects: 36 },
    quality: { evidenceCoverage: 58, customerValidation: 49, competitorCoverage: 66, sourceCount: 17, overall: 54 },
    history: [{ month: "Jan", score: 66, confidence: 34 }, { month: "Feb", score: 69, confidence: 44 }, { month: "Mar", score: 74, confidence: 59 }, { month: "Apr", score: 74, confidence: 64 }, { month: "May", score: 74, confidence: 64 }],
    timeline: [{ date: "Jul 2", type: "Competitor", title: "Added Provet Cloud and regional clinic software" }],
    chapters: chapters("Veterinary"),
  },
  {
    slug: "construction",
    name: "Construction",
    status: "Deep Research",
    stage: "Deep Research",
    score: 71,
    chance: 12,
    completeness: 75,
    confidence: 73,
    recommendation: "Narrow workflow",
    tags: ["Projects", "Collections", "Crews"],
    updatedAt: "Jun 29, 2026",
    summary: "Construction services are large but heterogeneous; the wedge likely needs to focus on a narrow trade or collections workflow.",
    strengths: ["Large spend", "Coordination pain", "Collections visibility"],
    weaknesses: ["Segment sprawl", "Hard onboarding"],
    framework: { competition: 70, fragmentation: 80, stickiness: 73, expansion: 68, messenger_dependence: 71, payment_flow: 70, market_size: 86, bypass_risk: 54, data_moat: 62, network_effects: 30 },
    quality: { evidenceCoverage: 77, customerValidation: 71, competitorCoverage: 76, sourceCount: 31, overall: 75 },
    history: [{ month: "Jan", score: 61, confidence: 40 }, { month: "Feb", score: 68, confidence: 51 }, { month: "Mar", score: 72, confidence: 66 }, { month: "Apr", score: 71, confidence: 73 }, { month: "May", score: 71, confidence: 73 }],
    timeline: [{ date: "Jun 29", type: "Research", title: "Split contractors into three workflow clusters" }],
    chapters: chapters("Construction"),
  },
  {
    slug: "laundry",
    name: "Laundry",
    status: "Screening",
    stage: "Screening",
    score: 66,
    chance: 9,
    completeness: 42,
    confidence: 57,
    recommendation: "Watch bypass risk",
    tags: ["Operations", "Delivery", "Low ACV"],
    updatedAt: "Jun 21, 2026",
    summary: "Laundry has operational repetition but may be too easy to solve with lightweight POS and messaging tools.",
    strengths: ["Repeat orders", "Simple workflow", "Delivery hooks"],
    weaknesses: ["Low ACV", "Easy bypass"],
    framework: { competition: 61, fragmentation: 76, stickiness: 66, expansion: 55, messenger_dependence: 78, payment_flow: 62, market_size: 54, bypass_risk: 41, data_moat: 48, network_effects: 25 },
    quality: { evidenceCoverage: 39, customerValidation: 43, competitorCoverage: 44, sourceCount: 11, overall: 42 },
    history: [{ month: "Jan", score: 59, confidence: 31 }, { month: "Feb", score: 62, confidence: 43 }, { month: "Mar", score: 66, confidence: 57 }, { month: "Apr", score: 66, confidence: 57 }, { month: "May", score: 66, confidence: 57 }],
    timeline: [{ date: "Jun 21", type: "Risk", title: "Bypass risk increased after cashier interviews" }],
    chapters: chapters("Laundry"),
  },
  {
    slug: "lpg",
    name: "LPG",
    status: "Rejected",
    stage: "Rejected",
    score: 58,
    chance: 5,
    completeness: 63,
    confidence: 69,
    recommendation: "Archive for now",
    tags: ["Logistics", "Commoditized", "Regulated"],
    updatedAt: "Jun 15, 2026",
    summary: "LPG distribution has clear logistics needs but weak software willingness to pay and high commodity pressure.",
    strengths: ["Recurring delivery", "Route density", "Inventory visibility"],
    weaknesses: ["Commodity margins", "Regulatory friction"],
    framework: { competition: 52, fragmentation: 67, stickiness: 54, expansion: 44, messenger_dependence: 58, payment_flow: 50, market_size: 61, bypass_risk: 38, data_moat: 42, network_effects: 22 },
    quality: { evidenceCoverage: 66, customerValidation: 61, competitorCoverage: 63, sourceCount: 22, overall: 63 },
    history: [{ month: "Jan", score: 56, confidence: 42 }, { month: "Feb", score: 60, confidence: 55 }, { month: "Mar", score: 58, confidence: 69 }, { month: "Apr", score: 58, confidence: 69 }, { month: "May", score: 58, confidence: 69 }],
    timeline: [{ date: "Jun 15", type: "Decision", title: "Archived after low willingness-to-pay signal" }],
    chapters: chapters("LPG"),
  },
];

export const competitors: Competitor[] = [
  {
    slug: "jobber",
    company: "Jobber",
    logo: "JB",
    website: "https://getjobber.com",
    country: "Canada",
    founded: "2011",
    employees: "700+",
    funding: "$183M",
    revenue: "$100M+ est.",
    customers: "250k+",
    pricing: "$29-$349/mo",
    targetSegment: "Field services",
    strengths: ["Mature scheduling", "Payments", "Mobile workflow"],
    weaknesses: ["Not localized", "Broad service positioning"],
    threatLevel: "Medium",
    linkedMarket: "workshop",
    features: { Scheduling: true, Payments: true, CRM: true, Inventory: false, "Messenger-first": false },
  },
  {
    slug: "salonized",
    company: "Salonized",
    logo: "SZ",
    website: "https://salonized.com",
    country: "Netherlands",
    founded: "2014",
    employees: "80+",
    funding: "Private",
    revenue: "$10M+ est.",
    customers: "12k+",
    pricing: "$25-$95/mo",
    targetSegment: "Beauty salons",
    strengths: ["Booking polish", "Client reminders", "Staff calendar"],
    weaknesses: ["Europe focus", "Payments localization"],
    threatLevel: "Low",
    linkedMarket: "beauty",
    features: { Scheduling: true, Payments: true, CRM: true, Inventory: false, "Messenger-first": false },
  },
  {
    slug: "provet-cloud",
    company: "Provet Cloud",
    logo: "PC",
    website: "https://www.provet.cloud",
    country: "Finland",
    founded: "2001",
    employees: "500+",
    funding: "Acquired",
    revenue: "$60M+ est.",
    customers: "3k+",
    pricing: "Enterprise",
    targetSegment: "Veterinary clinics",
    strengths: ["Deep records", "Clinical workflows", "Enterprise trust"],
    weaknesses: ["Heavy product", "Implementation burden"],
    threatLevel: "High",
    linkedMarket: "veterinary",
    features: { Scheduling: true, Payments: true, CRM: true, Inventory: true, "Messenger-first": false },
  },
];

export const sources: Source[] = [
  { id: "src-1", title: "Philippines MSME Statistics 2024", url: "https://example.com/msme", date: "2024-10-11", publisher: "DTI", evidenceLevel: "Primary", notes: "Market denominator and sector fragmentation.", category: "Market Size", linkedMarket: "workshop" },
  { id: "src-2", title: "Messenger Commerce Adoption Notes", url: "https://example.com/messenger-commerce", date: "2025-02-04", publisher: "Field Interviews", evidenceLevel: "Interview", notes: "How owners coordinate bookings and payment confirmations.", category: "Workflow", linkedMarket: "beauty" },
  { id: "src-3", title: "Service Business Payments Desk Review", url: "https://example.com/payments", date: "2025-04-18", publisher: "Internal Research", evidenceLevel: "Secondary", notes: "Payment friction across service categories.", category: "Payments", linkedMarket: "construction" },
  { id: "src-4", title: "Workshop Owner Interview Batch 03", url: "https://example.com/interviews/workshop-03", date: "2026-06-28", publisher: "Internal Research", evidenceLevel: "Interview", notes: "Nine interviews across Quezon City and Pasig.", category: "Customer Validation", linkedMarket: "workshop" },
];

export const notes: Note[] = [
  { title: "Workshop payment confirmation may be the wedge", status: "Verified", importance: "High", tags: ["payments", "workflow"], linkedMarket: "workshop", linkedCompetitor: "jobber" },
  { title: "Beauty salon pricing ceiling needs Manila validation", status: "Needs Validation", importance: "High", tags: ["pricing"], linkedMarket: "beauty", linkedCompetitor: "salonized" },
  { title: "Construction should split by trade before scoring again", status: "Open", importance: "Medium", tags: ["segmentation"], linkedMarket: "construction" },
  { title: "LPG route planning is not enough to justify vertical SaaS", status: "Rejected", importance: "Medium", tags: ["bypass"], linkedMarket: "lpg" },
];

export const aiActions = [
  "Summarize",
  "Challenge Assumptions",
  "Find Missing Competitors",
  "Generate SWOT",
  "Generate V1",
  "Generate Roadmap",
  "Generate Pitch Deck",
  "Generate Investment Memo",
  "Generate Risks",
  "Generate Go To Market",
  "Generate Pricing",
];

export const dashboardStats = [
  { label: "Markets Screened", value: markets.length.toString(), detail: "6 active verticals" },
  { label: "Deep Research", value: markets.filter((m) => m.status === "Deep Research").length.toString(), detail: "2 in diligence" },
  { label: "Completed Reports", value: "4", detail: "2 awaiting source QA" },
  { label: "Average Total Score", value: Math.round(markets.reduce((sum, item) => sum + item.score, 0) / markets.length).toString(), detail: "+6 vs last cycle" },
  { label: "Average Confidence", value: `${Math.round(markets.reduce((sum, item) => sum + item.confidence, 0) / markets.length)}%`, detail: "interview weighted" },
  { label: "Highest Ranked Market", value: "Workshop", detail: "86 weighted score" },
];

export function weightedScore(market: Market) {
  return calculateWeightedMarketScore(frameworkWeights.map((item) => ({ key: item.key, score: market.framework[item.key] })));
}

export function getMarket(slug: string) {
  return markets.find((market) => market.slug === slug);
}

export function getCompetitor(slug: string) {
  return competitors.find((competitor) => competitor.slug === slug);
}

export function statusIcon(status: string) {
  return status === "Verified" || status === "Investment Ready" ? CheckCircle2 : ClipboardList;
}
