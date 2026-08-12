# daily-proverbs-esv

Posts the day's chapter of Proverbs (ESV) to Slack every morning — as a scheduled [Cloudflare Worker](https://developers.cloudflare.com/workers/).

The Worker runs on a cron trigger at 2:00 AM daily (matching the original EC2 cron job), fetches `Proverbs {day-of-month}` from the [ESV API](https://api.esv.org/), and posts it to Slack via `chat.postMessage`. No server, no pip dependencies, no EC2 instance to babysit.

## How it works

- `src/index.ts` — the Worker. A `scheduled` handler runs on the cron trigger; a `fetch` handler allows manual triggering (see below).
- `wrangler.jsonc` — config: cron schedule `0 2 * * *`, observability, channel variable.

## Setup

1. Register an API key at https://api.esv.org/ (free).
2. Create a Slack app with the `chat:write` bot scope and add it to your channel (default `#dailyproverbs`).
3. Install dependencies:

   ```sh
   npm install
   ```

4. Set the secrets (never commit these):

   ```sh
   npx wrangler secret put ESV_API_KEY
   npx wrangler secret put SLACK_TOKEN
   ```

5. Deploy:

   ```sh
   npm run deploy
   ```

The cron trigger is registered automatically on deploy.

## Local development

Create a `.dev.vars` file (gitignored) with your local secrets, then run:

```sh
npm run dev
```

With `--test-scheduled`, `wrangler dev` exposes `http://localhost:8787/__scheduled` to fire the cron handler manually.

## Manual trigger

For debugging, the `fetch` handler runs the same job when called with a bearer-style token:

```sh
npx wrangler secret put MANUAL_TOKEN
curl -H "X-Auth-Token: <token>" https://daily-proverbs-esv.<your-account>.workers.dev/
```

(If `MANUAL_TOKEN` is not set, the endpoint always returns 401.)

## Configuration

| Variable         | Type   | Default        | Purpose                          |
| ---------------- | ------ | -------------- | -------------------------------- |
| `ESV_API_KEY`    | secret | —              | ESV API key                      |
| `SLACK_TOKEN`    | secret | —              | Slack bot token (`chat:write`)   |
| `SLACK_CHANNEL`  | var    | `#dailyproverbs` | Slack channel to post to        |
| `MANUAL_TOKEN`   | secret | unset          | Token required for manual trigger |