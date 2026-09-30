// Renders og/og-image.html -> public/og.png and og/icon.html -> public/apple-touch-icon.png.
// Usage: npm install --no-save playwright-core && node og/render.mjs
// Set CHROMIUM_PATH if Playwright's Chromium isn't at the default cache location.
import { chromium } from "playwright-core";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const executablePath =
  process.env.CHROMIUM_PATH ??
  join(homedir(), "Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing");

const jobs = [
  { src: "og-image.html", out: "../public/og.png", width: 1200, height: 630 },
  { src: "icon.html", out: "../public/apple-touch-icon.png", width: 180, height: 180 },
];

const browser = await chromium.launch({ executablePath });
for (const { src, out, width, height } of jobs) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(`file://${join(here, src)}`);
  await page.screenshot({ path: join(here, out) });
  await page.close();
}
await browser.close();
