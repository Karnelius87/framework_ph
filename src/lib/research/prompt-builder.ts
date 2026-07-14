import type { Market } from "@/data/research";

export const researchPromptTopics = [
  {
    key: "investment_decision",
    label: "Investment decision",
    focus: "Decide whether this market deserves build, deeper validation, watch, or rejection.",
  },
  {
    key: "competitors",
    label: "Competitor map",
    focus: "Map direct competitors, substitutes, pricing, positioning, and weak points.",
  },
  {
    key: "willingness_to_pay",
    label: "Willingness to pay",
    focus: "Validate price sensitivity, budget owners, payment behavior, and kill criteria.",
  },
  {
    key: "workflow",
    label: "Workflow pain",
    focus: "Document daily workflow, operational friction, switching barriers, and software wedge.",
  },
  {
    key: "go_to_market",
    label: "Go to market",
    focus: "Find acquisition channels, sales motion, local trust loops, and first customer segment.",
  },
] as const;

export type ResearchPromptTopicKey = (typeof researchPromptTopics)[number]["key"];
export type ResearchPromptDepth = "quick" | "standard" | "deep";
export type ResearchPromptLanguage = "english" | "swedish";

export type ResearchPromptMarket = Pick<
  Market,
  "slug" | "name" | "summary" | "status" | "stage" | "recommendation" | "score" | "confidence" | "completeness" | "chance" | "strengths" | "weaknesses"
>;

type BuildResearchPromptInput = {
  market: ResearchPromptMarket;
  topicKey: ResearchPromptTopicKey;
  depth: ResearchPromptDepth;
  language: ResearchPromptLanguage;
  customFocus?: string;
  researchDate: string;
};

const depthGuidance: Record<ResearchPromptDepth, string> = {
  quick: "Use a compact pass: 3-5 claims, 2-4 sources, 1-2 competitors, 2 unknowns, 2 next actions.",
  standard: "Use a decision-quality pass: 6-10 claims, 4-8 sources, 3-5 competitors, 3-5 unknowns, 3-5 next actions.",
  deep: "Use a deep diligence pass: 10-16 claims, 8-14 sources, 5-8 competitors, 5-8 unknowns, 5-8 next actions, and explicit kill criteria.",
};

export function buildResearchPrompt({ market, topicKey, depth, language, customFocus, researchDate }: BuildResearchPromptInput) {
  const topic = researchPromptTopics.find((item) => item.key === topicKey) ?? researchPromptTopics[0];
  const responseLanguage = language === "swedish" ? "Swedish" : "English";
  const packageIdDate = researchDate.replaceAll("-", "");
  const customFocusLine = customFocus?.trim()
    ? `Extra focus from me: ${customFocus.trim()}`
    : "Extra focus from me: identify the highest-leverage insight that changes the pursue / reject decision.";

  return `You are my research analyst for White Space Project, a Philippines vertical SaaS market selection tool.

Return one strict Research Package JSON block for local import. Write human-readable text fields in ${responseLanguage}, but keep all JSON keys exactly as specified.

Market context:
- marketSlug: ${market.slug}
- marketName: ${market.name}
- current status: ${market.status}
- current stage: ${market.stage}
- current recommendation: ${market.recommendation}
- current market score: ${market.score}
- current confidence: ${market.confidence}%
- current completeness: ${market.completeness}%
- current chance of becoming #1: ${market.chance}%
- summary: ${market.summary}
- known strengths: ${market.strengths.join(", ")}
- known weaknesses: ${market.weaknesses.join(", ")}

Research topic:
- topic: ${topic.key}
- focus: ${topic.focus}
- depth: ${depthGuidance[depth]}
- ${customFocusLine}

Rules:
1. Return only one fenced json code block. No extra commentary outside the block.
2. Use importVersion "2.0".
3. Every claim must link to sourceIds when possible.
4. If evidence is not independently sourced, mark notes or descriptions with "Demo / Hypothesis".
5. Use evidenceLevel A for strongest primary sources, B for credible market/news/company sources, C for directories/reviews/interviews, D for weak or inferred evidence.
6. Keep confidence numbers honest. Claim confidence is 0-1. Coverage and strategic confidence fields are 0-100.
7. Suggested score changes must use categories from: competition, fragmentation, stickiness, expansion, messenger_dependence, payment_flow, market_size, bypass_risk, data_moat, network_effects.
8. Coverage updates must use categories such as customer_validation, competition, willingness_to_pay, workflow, pricing, go_to_market, regulation, payments, interviews, sources.
9. Include nextResearchActions that are practical for me to execute next.

JSON shape to return:
\`\`\`json
{
  "importVersion": "2.0",
  "importId": "${market.slug}-${topic.key}-${packageIdDate}",
  "version": "v1",
  "marketSlug": "${market.slug}",
  "topic": "${topic.key}",
  "researchDate": "${researchDate}",
  "title": "${market.name} ${topic.label} research update",
  "summary": "One concise paragraph.",
  "executiveSummary": "Decision-focused summary with what changed and why it matters.",
  "recommendation": "Continue / validate / watch / reject with rationale.",
  "recommendationConfidence": 0.65,
  "researcher": "ChatGPT",
  "reportMarkdown": "## Findings\\n\\nReadable memo text.",
  "claims": [],
  "sources": [],
  "competitors": [],
  "assumptions": [],
  "risks": [],
  "openQuestions": [],
  "suggestedScoreChanges": [],
  "supportingEvidence": [],
  "opposingEvidence": [],
  "criticalUnknowns": [],
  "killCriteria": [],
  "whyWeWin": [],
  "whyWeMayLose": [],
  "nextResearchActions": [],
  "coverageUpdates": [],
  "decisionLogEntries": [],
  "reportUpdates": []
}
\`\`\``;
}
