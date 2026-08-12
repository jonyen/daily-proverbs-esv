const ESV_API_URL = "https://api.esv.org/v3/passage/text/";
const CACHE_TTL_SECONDS = 12 * 60 * 60;

interface AppEnv extends Env {
  ESV_API_KEY: string;
}

function clampChapter(day: number): number {
  return Math.min(31, Math.max(1, day));
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function fetchChapter(chapter: number, env: AppEnv): Promise<{ text: string; copyright: string }> {
  const params = new URLSearchParams({
    q: `Proverbs ${chapter}`,
    "include-footnotes": "false",
    "include-passage-references": "false",
    "include-short-copyright": "true",
    "include-headings": "false",
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
  const verses = passage
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const title = `Proverbs ${chapter}`;
  const formatted = date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

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
      margin: 0; padding: 3rem 1.25rem 4rem;
      background: var(--paper); color: var(--ink);
      font-family: Georgia, "Times New Roman", serif; line-height: 1.75;
    }
    main { max-width: 42rem; margin: 0 auto; }
    header { text-align: center; margin-bottom: 2.5rem; }
    h1 { font-size: 1.9rem; margin: 0 0 .4rem; letter-spacing: .01em; }
    .date { color: var(--muted); font-size: .95rem; font-style: italic; }
    .rule { border: none; border-top: 1px solid var(--rule); margin: 1.75rem 0; }
    .verses p { margin: 0 0 1rem; }
    footer { margin-top: 3rem; color: var(--muted); font-size: .78rem; line-height: 1.5; text-align: center; }
    footer .copyright { font-style: italic; margin-top: .4rem; }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>${title}</h1>
      <div class="date">${formatted}</div>
    </header>
    <hr class="rule">
    <section class="verses">
      ${verses.map((verse) => `<p>${verse}</p>`).join("\n      ")}
    </section>
    <hr class="rule">
    <footer>
      <div>Daily Proverbs — a chapter a day</div>
      ${copyright ? `<div class="copyright">${copyright}</div>` : ""}
    </footer>
  </main>
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

    const cacheKey = `https://daily-proverbs-esv/cache/${dateKey(today)}-${chapter}`;
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