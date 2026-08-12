# daily-proverbs-esv

Serves the day's chapter of Proverbs (ESV) at [proverbs.jonyen.com](https://proverbs.jonyen.com) — a [Cloudflare Worker](https://developers.cloudflare.com/workers/).

The Worker fetches `Proverbs {day-of-month}` from the [ESV API](https://api.esv.org/) on every visit and renders it as a clean, typographic page. No cron job, no server, no delivery infrastructure — the "daily" chapter is computed from the date at request time. Responses are cached for 12 hours, so the ESV API is hit at most twice a day.

## How it works

- `src/index.ts` — the Worker. Fetches the chapter from the ESV API server-side, renders an HTML page, caches it, and serves it from the custom domain.
- `wrangler.jsonc` — config: custom domain binding for `proverbs.jonyen.com`, observability enabled.

## Setup

1. Register a free API key at https://api.esv.org/.
2. Install dependencies:

   ```sh
   npm install
   ```

3. Set the API key as a secret (never commit it):

   ```sh
   npx wrangler secret put ESV_API_KEY
   ```

4. Deploy — this registers the `proverbs.jonyen.com` custom domain automatically (the zone must be in your Cloudflare account, which `jonyen.com` already is):

   ```sh
   npm run deploy
   ```

## Local development

Create a `.dev.vars` file (gitignored) with `ESV_API_KEY=<your key>`, then run:

```sh
npm run dev
```

Visit `http://localhost:8787/` — add `?day=5` to preview any chapter 1–31.

## Configuration

| Variable      | Type   | Default | Purpose                        |
| ------------- | ------ | ------- | ------------------------------ |
| `ESV_API_KEY` | secret | —       | ESV API key                    |

## Notes

- Chapters are clamped to Proverbs 1–31, the actual extent of the book.
- ESV text is served with the short copyright notice in the footer, as required by the ESV API terms.