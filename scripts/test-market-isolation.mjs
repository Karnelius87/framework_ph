/* global console, process, fetch, setTimeout */

import { spawn } from "node:child_process";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";
import { chromium } from "playwright";

const BASE_URL = process.env.MARKET_ISOLATION_BASE_URL ?? "http://localhost:3000";
const MARKET_SLUGS = ["workshop", "beauty", "veterinary", "construction", "laundry", "lpg"];
const WORKSHOP_ONLY_PATTERNS = [
  /Free Workshop OS/i,
  /Workshop OS/i,
  /automotive repair/i,
  /Workshops onboarded/i,
  /motor oil/i,
  /liters\/month/i,
  /supplier resale spread/i,
];

let devServer;

async function main() {
  await ensureServer();
  const browser = await chromium.launch({ headless: true });

  try {
    await testBeautyDirect(browser);
    await testWorkshopDirect(browser);
    await testRouteSwitching(browser);
    await testAllMarkets(browser);
    await testApiIsolation();
    await testDatabaseIsolation();
    console.log("Market isolation regression tests passed.");
  } finally {
    await browser.close();
    if (devServer) devServer.kill();
  }
}

async function ensureServer() {
  if (await canFetch(BASE_URL)) return;

  const command = process.platform === "win32" ? "cmd.exe" : "npm";
  const args = process.platform === "win32" ? ["/c", "npm.cmd", "run", "dev"] : ["run", "dev"];
  devServer = spawn(command, args, {
    cwd: process.cwd(),
    stdio: "ignore",
    shell: false,
    windowsHide: true,
    env: { ...process.env },
  });

  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    if (await canFetch(BASE_URL)) return;
    await delay(1000);
  }

  throw new Error(`Could not start or reach dev server at ${BASE_URL}`);
}

async function canFetch(url) {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

async function testBeautyDirect(browser) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(`${BASE_URL}/markets/beauty`, { waitUntil: "domcontentloaded" });
  const text = await page.locator("body").innerText();

  assertIncludes(text, "What We Are Building", "Beauty should render What We Are Building.");
  assertIncludes(text, "Product strategy not yet defined.", "Beauty should show neutral missing-strategy state.");
  assertIncludes(text, "Define Beauty Ideal Customer Profile.", "Beauty should show market-specific neutral next action.");
  assertExcludes(text, WORKSHOP_ONLY_PATTERNS, "Beauty direct navigation must not contain Workshop-specific content.");
  await page.close();
}

async function testWorkshopDirect(browser) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(`${BASE_URL}/markets/workshop`, { waitUntil: "domcontentloaded" });
  const text = await page.locator("body").innerText();

  assertIncludes(text, "Free Workshop OS for independent automotive repair shops.", "Workshop should keep Workshop product strategy.");
  assertIncludes(text, "Garage Management Software (GMS)", "Workshop should keep GMS subtitle.");
  assertIncludes(text, "Workshops onboarded", "Workshop should keep Workshop adoption metrics.");
  await page.close();
}

async function testRouteSwitching(browser) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(`${BASE_URL}/markets/workshop`, { waitUntil: "domcontentloaded" });
  let text = await page.locator("body").innerText();
  assertIncludes(text, "Free Workshop OS", "Workshop content should render before route switch.");

  await page.getByRole("link", { name: "Markets" }).first().click();
  await page.waitForURL("**/markets");
  await page.getByRole("link", { name: "Beauty" }).first().click();
  await page.waitForURL("**/markets/beauty");
  text = await page.locator("body").innerText();
  assertExcludes(text, WORKSHOP_ONLY_PATTERNS, "Workshop content must disappear after client route switch to Beauty.");
  assertIncludes(text, "Define Beauty Ideal Customer Profile.", "Beauty route switch should show neutral Beauty task.");

  await page.getByRole("link", { name: "Markets" }).first().click();
  await page.waitForURL("**/markets");
  await page.getByRole("link", { name: "Workshop" }).first().click();
  await page.waitForURL("**/markets/workshop");
  text = await page.locator("body").innerText();
  assertIncludes(text, "Free Workshop OS", "Workshop content should return after switching back.");
  await page.close();
}

async function testAllMarkets(browser) {
  const contaminationReport = {};

  for (const slug of MARKET_SLUGS) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(`${BASE_URL}/markets/${slug}`, { waitUntil: "domcontentloaded" });
    const text = await page.locator("body").innerText();
    const contamination = slug === "workshop" ? [] : matchingPatterns(text, WORKSHOP_ONLY_PATTERNS);
    contaminationReport[slug] = contamination.length ? `FAIL: ${contamination.join(", ")}` : "PASS";
    if (contamination.length) {
      throw new Error(`${slug} contains Workshop-specific content: ${contamination.join(", ")}`);
    }
    await page.close();
  }

  console.log(`Contamination report: ${JSON.stringify(contaminationReport)}`);
}

async function testApiIsolation() {
  for (const slug of MARKET_SLUGS) {
    const response = await fetch(`${BASE_URL}/api/intelligence/market/${slug}?limit=50`);
    if (!response.ok) throw new Error(`API request failed for ${slug}: ${response.status}`);
    const text = JSON.stringify(await response.json());
    if (slug !== "workshop") assertExcludes(text, WORKSHOP_ONLY_PATTERNS, `API graph for ${slug} must not contain Workshop-only content.`);
  }
}

async function testDatabaseIsolation() {
  const db = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: "file:./data/local.db" }) });
  try {
    const markets = await db.market.findMany({
      include: {
        researchActions: true,
        criticalUnknowns: true,
        killCriteria: true,
        researchCoverage: true,
        decisionLogs: true,
        scoreHistory: true,
        productStrategySnapshot: true,
      },
    });

    for (const market of markets) {
      if (market.productStrategySnapshot && market.productStrategySnapshot.marketId !== market.id) {
        throw new Error(`Product strategy snapshot for ${market.slug} is attached to ${market.productStrategySnapshot.marketId}, expected ${market.id}`);
      }
      if (market.slug === "workshop" && !market.productStrategySnapshot) {
        throw new Error("Workshop should have an imported product strategy snapshot.");
      }

      for (const collection of ["researchActions", "criticalUnknowns", "killCriteria", "researchCoverage", "decisionLogs", "scoreHistory"]) {
        for (const item of market[collection]) {
          if (item.marketId !== market.id) {
            throw new Error(`${collection} item ${item.id} is attached to ${item.marketId}, expected ${market.id}`);
          }
        }
      }
    }
  } finally {
    await db.$disconnect();
  }
}

function assertIncludes(text, expected, message) {
  if (!text.includes(expected)) throw new Error(`${message} Missing: ${expected}`);
}

function assertExcludes(text, patterns, message) {
  const matches = matchingPatterns(text, patterns);
  if (matches.length) throw new Error(`${message} Found: ${matches.join(", ")}`);
}

function matchingPatterns(text, patterns) {
  return patterns.filter((pattern) => pattern.test(text)).map((pattern) => pattern.source);
}

function delay(ms) {
  return new Promise((resolve) => {
    const timeout = setTimeout(resolve, ms);
    timeout.unref?.();
  });
}

main().catch((error) => {
  console.error(error);
  if (devServer) devServer.kill();
  process.exit(1);
});
