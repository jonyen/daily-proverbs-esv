// Run with: npm test (node --test; Node 23.6 or later runs TypeScript directly).
//
// Visit counting: anonymous, cookieless, aggregate visit counts via GoatCounter;
// no personal data. Every page loads GoatCounter once, for this site, pinned by
// SRI, and reports the one path "/" so a reader counts once per visit.
import assert from "node:assert/strict";
import { test } from "node:test";

// The Worker reads `caches` and `fetch` only inside its handler, so both are
// stubbed before each request: the ESV API answers with one verse.
Object.assign(globalThis, {
  fetch: async () => Response.json({ passages: ["[1] The proverbs of Solomon. (ESV)"], copyright: "(ESV)" }),
});
const emptyCache = { match: async () => undefined, put: async () => {} };
const { default: worker } = await import("../src/index.ts");

const TAGS = /<script\b[^>]*\bdata-goatcounter="[^"]*"[^>]*><\/script>/g;
const env = { ESV_API_KEY: "test-esv-key" };

test("the page loads GoatCounter once, for the daily-proverbs-esv site, pinned by SRI", async () => {
  Object.assign(globalThis, { caches: { default: emptyCache } });
  const res = await worker.fetch(new Request("https://proverbs.jonyen.com/?day=5"), env);
  assert.equal(res.status, 200);
  const tags = (await res.text()).match(TAGS) ?? [];
  assert.equal(tags.length, 1);
  const [tag] = tags;
  assert.ok(tag.includes('data-goatcounter="https://jonyen-daily-proverbs-esv.goatcounter.com/count"'));
  assert.ok(tag.includes('src="https://gc.zgo.at/count.v5.js"'));
  assert.match(tag, /\sasync[\s>]/);
  assert.ok(tag.includes('crossorigin="anonymous"'));
  assert.ok(tag.includes('integrity="sha384-atnOLvQb9t+jTSipvd75X2yginT4PjVbqDdlJAmxMm+wYElFmeR6EmLP5bYeoRVQ"'));
  // One path for every day's page, so a reader counts once per visit.
  assert.deepEqual(JSON.parse(tag.match(/data-goatcounter-settings='([^']*)'/)[1]), { path: "/" });
});

test("a page cached before the counting tag is never served", async () => {
  // Pages rendered before this change sit in the Cache API under RENDER_VERSION 13.
  const stale = {
    match: async (key: string) => (key.endsWith("-v13") ? new Response("stale page") : undefined),
    put: async () => {},
  };
  Object.assign(globalThis, { caches: { default: stale } });
  const res = await worker.fetch(new Request("https://proverbs.jonyen.com/?day=5"), env);
  const html = await res.text();
  assert.notEqual(html, "stale page");
  assert.equal(html.match(TAGS)?.length, 1);
});
