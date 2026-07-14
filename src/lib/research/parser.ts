import { researchPackageSchema, type ResearchPackage } from "@/lib/research/schema";

export type DetectedJsonBlock = {
  id: string;
  label: string;
  jsonText: string;
  parsed?: unknown;
  validPackage?: ResearchPackage;
  errors: string[];
};

function uniqueBlocks(blocks: Omit<DetectedJsonBlock, "id">[]) {
  const seen = new Set<string>();
  return blocks
    .filter((block) => {
      const key = block.jsonText.trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((block, index) => ({ ...block, id: `block-${index + 1}` }));
}

function parseCandidate(label: string, jsonText: string): Omit<DetectedJsonBlock, "id"> {
  try {
    const parsed = JSON.parse(jsonText);
    const result = researchPackageSchema.safeParse(parsed);
    return {
      label,
      jsonText,
      parsed,
      validPackage: result.success ? result.data : undefined,
      errors: result.success ? [] : result.error.issues.map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`),
    };
  } catch (error) {
    return {
      label,
      jsonText,
      errors: [error instanceof Error ? error.message : "Invalid JSON"],
    };
  }
}

function findBalancedJsonObjects(input: string) {
  const results: string[] = [];
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === "{") {
      if (depth === 0) start = index;
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        results.push(input.slice(start, index + 1));
        start = -1;
      }
    }
  }

  return results;
}

export function detectResearchPackages(input: string): DetectedJsonBlock[] {
  const blocks: Omit<DetectedJsonBlock, "id">[] = [];

  for (const match of input.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)) {
    blocks.push(parseCandidate(match[0].toLowerCase().startsWith("```json") ? "Fenced JSON block" : "Fenced code block", match[1].trim()));
  }

  const packageSection = input.match(/research package\s*:?\s*([\s\S]*)/i);
  if (packageSection) {
    for (const object of findBalancedJsonObjects(packageSection[1])) {
      blocks.push(parseCandidate("Research Package section", object));
    }
  }

  const trimmed = input.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    blocks.push(parseCandidate("Raw JSON", trimmed));
  }

  for (const object of findBalancedJsonObjects(input)) {
    blocks.push(parseCandidate("JSON surrounded by text", object));
  }

  return uniqueBlocks(blocks);
}
