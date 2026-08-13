const ESV_API_URL = "https://api.esv.org/v3/passage/text/";
const CACHE_TTL_SECONDS = 12 * 60 * 60;
const RENDER_VERSION = 9;
const ESV_ATTRIBUTION =
  "The Holy Bible, English Standard Version® (ESV®), copyright © 2001 by Crossway, a publishing ministry of Good News Publishers. Used by permission. All rights reserved.";

interface AppEnv extends Env {
  ESV_API_KEY: string;
}

function clampChapter(day: number): number {
  return Math.min(31, Math.max(1, day));
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

interface Verse {
  number: number;
  lines: string[];
}

function parseVerses(passage: string): Verse[] {
  const verses: Verse[] = [];
  let current: Verse | null = null;

  for (const rawLine of passage.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const match = line.match(/^\[(\d+)\]\s*(.*)$/);
    if (match) {
      if (current) verses.push(current);
      current = { number: Number(match[1]), lines: [match[2]] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) verses.push(current);

  const result = verses.length > 0 ? verses : [];
  if (result.length === 0) {
    return passage
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((text, i) => ({ number: i + 1, lines: [text] }));
  }

  const last = result[result.length - 1];
  const lastLineIndex = last.lines.length - 1;
  last.lines[lastLineIndex] = last.lines[lastLineIndex].replace(/\s*\(ESV\)\s*$/, "").trim();
  return result;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderText(text: string): string {
  return escapeHtml(text).replace(/\bLORD\b/g, '<span class="lord">Lord</span>');
}

async function fetchChapter(chapter: number, env: AppEnv): Promise<{ text: string; copyright: string }> {
  const params = new URLSearchParams({
    q: `Proverbs ${chapter}`,
    "include-footnotes": "false",
    "include-passage-references": "false",
    "include-short-copyright": "true",
    "include-headings": "false",
    "include-verse-numbers": "true",
  });

  const response = await fetch(`${ESV_API_URL}?${params}`, {
    headers: { Authorization: `Token ${env.ESV_API_KEY}` },
  });

  if (!response.ok) {
    throw new Error(`ESV API responded with ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as { passages?: string[]; copyright?: string };
  const text = data.passages?.[0]?.trim();
  if (!text) {
    throw new Error("ESV API returned no passages");
  }
  return { text, copyright: data.copyright ?? "" };
}

function renderPage(chapter: number, date: Date, passage: string, copyright: string): string {
  const verses = parseVerses(passage);

  const title = `Proverbs ${chapter}`;
  const formatted = date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  const versesHtml = verses
    .map((v) => {
      const lines = v.lines
        .map((line, i) => {
          const number = i === 0 ? `<span class="v">${v.number}&nbsp;</span>` : "";
          const cls = i === 0 ? "line" : "line indent";
          return `      <p class="${cls}">${number}${renderText(line)}</p>`;
        })
        .join("\n");
      return `<div class="verse" data-number="${v.number}">\n${lines}\n    </div>`;
    })
    .join("\n      ");
  const dayLinks = Array.from({ length: 31 }, (_, i) => {
    const day = i + 1;
    const cls = day === chapter ? "current" : "";
    return `<a class="${cls}" href="/?day=${day}">${day}</a>`;
  }).join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} — Daily Proverbs</title>
  <meta name="description" content="The ${title}, English Standard Version, for ${formatted}.">
  <style>
    :root { --ink: #2b2723; --paper: #faf7f0; --muted: #8a8378; --rule: #e3dccb; }
    * { box-sizing: border-box; }
    body {
      margin: 0; padding: 1.75rem 1.25rem 2.5rem;
      background: var(--paper); color: var(--ink);
      font-family: Georgia, "Times New Roman", serif; line-height: 1.65;
    }
    main { max-width: 96rem; margin: 0 auto; }
    header { text-align: center; margin-bottom: 1.5rem; }
    h1 { font-size: 1.9rem; margin: 0 0 .4rem; letter-spacing: .01em; }
    .date { color: var(--muted); font-size: .95rem; font-style: italic; }
    .rule { border: none; border-top: 1px solid var(--rule); margin: 1.5rem 0; }
    .verses {
      column-width: 20rem;
      column-gap: 2.5rem;
      column-rule: 1px solid var(--rule);
    }
    .verse { break-inside: avoid; }
    .verse.hl { background: #fce9a8; box-shadow: 0 0 0 .18em #fce9a8; border-radius: .15em; }
    .verses p { margin: 0; }
    .verses p.indent { padding-left: 1.3em; }
    .verses .v { font-size: .7em; color: var(--muted); }
    .verses .lord { font-variant: small-caps; }
    body.selecting ::selection { background: #fce9a8; color: var(--ink); }
    .copy-pill {
      position: fixed; left: 50%; bottom: 1.5rem; transform: translateX(-50%);
      background: var(--ink); color: var(--paper);
      font: inherit; font-size: .85rem; padding: .5rem 1rem; border-radius: 99px;
      border: none; cursor: pointer; box-shadow: 0 .35rem 1.25rem rgba(0,0,0,.22);
      z-index: 10; opacity: 0; pointer-events: none; transition: opacity .18s ease;
    }
    .copy-pill.show { opacity: 1; pointer-events: auto; }
    .copy-pill:active { transform: translateX(-50%) scale(.97); }
    footer { margin-top: 2rem; color: var(--muted); font-size: .78rem; line-height: 1.5; text-align: center; }
    footer .copyright { font-style: italic; margin-top: .4rem; }
    .verse-links { display: flex; flex-wrap: wrap; justify-content: center; gap: .35rem .7rem; margin: .6rem 0 1.1rem; }
    .verse-links a { color: var(--muted); text-decoration: none; font-size: 1.05rem; font-variant-numeric: tabular-nums; }
    .verse-links a:hover { color: var(--ink); text-decoration: underline; }
    .verse-links a.current { color: var(--ink); font-weight: 700; }
    .esv-link a { color: var(--ink); }
  </style>
</head>
<body>
  <main data-day="${chapter}">
    <header>
      <h1>${title}</h1>
      <div class="date">${formatted}</div>
    </header>
    <hr class="rule">
    <section class="verses">
      ${versesHtml}
    </section>
    <hr class="rule">
    <footer>
      <div>Daily Proverbs — a chapter a day</div>
      <nav class="verse-links" aria-label="Days of the month">
        ${dayLinks}
      </nav>
      <div class="copyright">${copyright || ESV_ATTRIBUTION}</div>
      <div class="esv-link">Read the <a href="https://www.esv.org/">ESV</a> at esv.org</div>
    </footer>
  </main>
  <button class="copy-pill" type="button" hidden>Copy selection</button>
  <script>
  (() => {
    const STORE_KEY = "daily-proverbs-highlights";
    const day = document.querySelector("main").dataset.day;
    const section = document.querySelector(".verses");
    const pill = document.querySelector(".copy-pill");

    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(STORE_KEY) || "{}"); } catch {}

    const byNumber = new Map();
    for (const el of section.querySelectorAll(".verse")) {
      byNumber.set(Number(el.dataset.number), el);
    }

    function load() {
      for (const n of saved[day] || []) {
        const el = byNumber.get(Number(n));
        if (el) el.classList.add("hl");
      }
    }

    function persist() {
      saved[day] = [...byNumber.keys()].filter((n) => byNumber.get(n).classList.contains("hl"));
      try { localStorage.setItem(STORE_KEY, JSON.stringify(saved)); } catch {}
    }

    function coveredVerseNumbers(range) {
      const numbers = [];
      for (const el of byNumber.values()) {
        if (range.intersectsNode(el)) numbers.push(Number(el.dataset.number));
      }
      return numbers;
    }

    function verseText(n) {
      const el = byNumber.get(n);
      return [...el.querySelectorAll("p")]
        .map((p) => p.innerText.trim().replace(/\bLord\b/g, "LORD"))
        .join("\\n")
        .trim();
    }

    function reference(nums) {
      const first = nums[0];
      const last = nums[nums.length - 1];
      const range = first === last ? String(first) : first + "–" + last;
      return "Proverbs " + day + ":" + range + " (ESV)";
    }

    function showPill(nums) {
      pill.textContent = "Copy " + reference(nums);
      pill.hidden = false;
      requestAnimationFrame(() => pill.classList.add("show"));
      const dismiss = () => {
        pill.classList.remove("show");
        pill.hidden = true;
        pill.removeEventListener("click", pill._click);
      };
      pill._click = async () => {
        const body = nums.map(verseText).filter(Boolean).join("\\n\\n");
        const text = reference(nums) + "\\n" + body;
        try {
          await navigator.clipboard.writeText(text);
          pill.textContent = "Copied";
          setTimeout(dismiss, 900);
        } catch {
          const ta = document.createElement("textarea");
          ta.value = text;
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          ta.remove();
          pill.textContent = "Copied";
          setTimeout(dismiss, 900);
        }
      };
      pill.addEventListener("click", pill._click);
      setTimeout(dismiss, 6000);
    }

    let dragging = false;

    document.addEventListener("mousedown", (e) => {
      if (!section.contains(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      dragging = true;
      document.body.classList.add("selecting");
    });

    document.addEventListener("mouseup", () => {
      if (!dragging) return;
      dragging = false;
      document.body.classList.remove("selecting");
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) return;
      let range;
      try { range = sel.getRangeAt(0); } catch { return; }
      sel.removeAllRanges();
      if (!section.contains(range.commonAncestorContainer)) return;

      const nums = coveredVerseNumbers(range);
      if (nums.length === 0) return;

      const all = nums.every((n) => byNumber.get(n).classList.contains("hl"));
      for (const n of nums) byNumber.get(n).classList.toggle("hl", !all);
      persist();
      if (!all) showPill(nums);
    });

    load();
  })();
  </script>
</body>
</html>`;
}

export default {
  async fetch(request: Request, env: AppEnv): Promise<Response> {
    const url = new URL(request.url);
    const today = new Date();
    const dayParam = url.searchParams.get("day");
    const requested = dayParam ? Number(dayParam) : today.getUTCDate();
    const chapter = clampChapter(Number.isFinite(requested) ? requested : today.getUTCDate());

    const cacheKey = `https://daily-proverbs-esv/cache/${dateKey(today)}-${chapter}-v${RENDER_VERSION}`;
    const cache = caches.default;
    const cached = await cache.match(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const { text, copyright } = await fetchChapter(chapter, env);
      const html = renderPage(chapter, today, text, copyright);
      const response = new Response(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": `public, max-age=${CACHE_TTL_SECONDS}`,
        },
      });
      await cache.put(cacheKey, response.clone());
      console.log(JSON.stringify({ event: "page.render", chapter, date: dateKey(today) }));
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(JSON.stringify({ event: "page.error", error: message }));
      return new Response(`<h1>Something went wrong</h1><p>${message}</p>`, {
        status: 502,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }
  },
};