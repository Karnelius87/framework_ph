import type { PrismaClient } from "@prisma/client";
import type { ResearchPackage } from "@/lib/research/schema";

export function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

export function normalizeUrl(value: string) {
  try {
    const url = new URL(value.replace(/^\[(https?:\/\/[^\]]+)\].*/, "$1"));
    url.hash = "";
    url.search = "";
    return url.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return value.toLowerCase().trim().replace(/\/$/, "");
  }
}

export function domainFromUrl(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function bigrams(value: string) {
  const text = normalizeText(value);
  const result = new Set<string>();
  for (let index = 0; index < text.length - 1; index += 1) {
    result.add(text.slice(index, index + 2));
  }
  return result;
}

export function stringSimilarity(left: string, right: string) {
  const a = bigrams(left);
  const b = bigrams(right);
  if (a.size === 0 || b.size === 0) return 0;
  const intersection = [...a].filter((item) => b.has(item)).length;
  return (2 * intersection) / (a.size + b.size);
}

export async function getDuplicateWarnings(db: PrismaClient, pkg: ResearchPackage) {
  const warnings: string[] = [];
  const market = await db.market.findUnique({ where: { slug: pkg.marketSlug } });

  if (!market) {
    warnings.push(`Unknown market "${pkg.marketSlug}". Save is allowed, but approval requires linking to a known market.`);
    return warnings;
  }

  const [claims, sources, competitors] = await Promise.all([
    db.claim.findMany({ where: { marketId: market.id }, include: { scoreCategory: true } }),
    db.source.findMany(),
    db.competitor.findMany(),
  ]);

  for (const claim of pkg.claims) {
    const normalized = normalizeText(claim.statement);
    const duplicate = claims.find((existing) => {
      const sameText = normalizeText(existing.statement) === normalized;
      const sameCategory = existing.scoreCategory?.key === claim.category;
      const similar = stringSimilarity(existing.statement, claim.statement) > 0.82;
      return sameCategory && (sameText || similar);
    });
    if (duplicate) warnings.push(`Possible duplicate claim "${claim.id}" matches existing claim "${duplicate.externalId}".`);
  }

  for (const source of pkg.sources) {
    const normalized = normalizeUrl(source.url);
    const duplicate = sources.find((existing) => existing.normalizedUrl === normalized || (normalizeText(existing.title) === normalizeText(source.title) && normalizeText(existing.publisher) === normalizeText(source.publisher)));
    if (duplicate) warnings.push(`Possible duplicate source "${source.id}" matches "${duplicate.title}".`);
  }

  for (const competitor of pkg.competitors) {
    const normalizedName = normalizeText(competitor.company);
    const domain = domainFromUrl(competitor.website || "");
    const duplicate = competitors.find((existing) => existing.normalizedName === normalizedName || (domain && existing.domain === domain));
    if (duplicate) warnings.push(`Possible duplicate competitor "${competitor.company}" matches "${duplicate.company}".`);
  }

  return warnings;
}
