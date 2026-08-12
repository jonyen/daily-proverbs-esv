const ESV_API_URL = "https://api.esv.org/v3/passage/text/";
const SLACK_API_URL = "https://slack.com/api/chat.postMessage";

interface AppEnv extends Env {
  ESV_API_KEY: string;
  SLACK_TOKEN: string;
  MANUAL_TOKEN?: string;
}

function dayOfMonth(date: Date): number {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  return utc.getUTCDate();
}

async function fetchProverbs(day: number, env: AppEnv): Promise<string> {
  const params = new URLSearchParams({
    q: `Proverbs ${day}`,
    "include-footnotes": "false",
    "include-passage-references": "false",
    "include-short-copyright": "false",
    "include-headings": "false",
  });

  const response = await fetch(`${ESV_API_URL}?${params}`, {
    headers: { Authorization: `Token ${env.ESV_API_KEY}` },
  });

  if (!response.ok) {
    throw new Error(`ESV API responded with ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as { passages?: string[] };
  const passage = data.passages?.[0]?.trim();
  if (!passage) {
    throw new Error("ESV API returned no passages");
  }
  return passage;
}

async function postToSlack(chapter: number, passage: string, env: AppEnv): Promise<void> {
  const body = {
    channel: env.SLACK_CHANNEL,
    mrkdwn: true,
    text: `*Proverbs ${chapter}* — ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}\n${passage}`,
  };

  const response = await fetch(SLACK_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.SLACK_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = (await response.json()) as { ok: boolean; error?: string };
  if (!response.ok || !data.ok) {
    throw new Error(`Slack API error: ${data.error ?? `${response.status} ${response.statusText}`}`);
  }
}

async function runJob(env: AppEnv): Promise<void> {
  const day = dayOfMonth(new Date());
  console.log(JSON.stringify({ event: "job.start", chapter: day }));
  const passage = await fetchProverbs(day, env);
  await postToSlack(day, passage, env);
  console.log(JSON.stringify({ event: "job.success", chapter: day }));
}

function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  if (aBytes.byteLength !== bBytes.byteLength) {
    return false;
  }
  return crypto.subtle.timingSafeEqual(aBytes, bBytes);
}

export default {
  async scheduled(_event: ScheduledEvent, env: AppEnv): Promise<void> {
    try {
      await runJob(env);
    } catch (error) {
      console.error(JSON.stringify({ event: "job.error", error: error instanceof Error ? error.message : String(error) }));
      throw error;
    }
  },

  async fetch(request: Request, env: AppEnv): Promise<Response> {
    const token = request.headers.get("X-Auth-Token");
    if (!env.MANUAL_TOKEN || !token || !timingSafeEqual(token, env.MANUAL_TOKEN)) {
      return new Response("Unauthorized", { status: 401 });
    }
    try {
      await runJob(env);
      return new Response("OK", { status: 200 });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(JSON.stringify({ event: "job.error", error: message }));
      return new Response(message, { status: 500 });
    }
  },
};