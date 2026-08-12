// Vercel serverless proxy: one token's top-20 logprobs from OpenRouter.
// The OpenRouter key lives in the OPENROUTER_API_KEY env var; the watermark
// key never leaves the visitor's browser — sampling happens client-side.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { API_MODELS } from '../src/lib/apiModels';

const ALLOWED = new Set(API_MODELS.map((m) => m.id));
const MAX_PROMPT_CHARS = 2000;
const MAX_GENERATED_CHARS = 8000;

interface TopLogprob {
  token: string;
  logprob: number;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const { model, prompt, generated } = (req.body ?? {}) as Record<string, unknown>;
  if (typeof model !== 'string' || !ALLOWED.has(model)) return res.status(400).json({ error: 'unknown model' });
  if (typeof prompt !== 'string' || prompt.length > MAX_PROMPT_CHARS) return res.status(400).json({ error: 'bad prompt' });
  if (typeof generated !== 'string' || generated.length > MAX_GENERATED_CHARS) {
    return res.status(400).json({ error: 'generation too long' });
  }
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return res.status(500).json({ error: 'OPENROUTER_API_KEY not configured' });

  // Assistant prefill gives true continuation semantics on the open-model
  // providers; temperature stays 1 here — the demo applies its own
  // temperature locally over the returned logprobs.
  const messages: { role: string; content: string }[] = [
    {
      role: 'user',
      content: `Continue the following story in plain prose. Reply only with the continuation, no preamble.\n\n${prompt}`,
    },
  ];
  if (generated.length > 0) messages.push({ role: 'assistant', content: generated });

  const body = JSON.stringify({
    model,
    messages,
    max_tokens: 1,
    temperature: 1,
    logprobs: true,
    top_logprobs: 20,
    // Never route to an endpoint that would silently drop logprobs.
    provider: { require_parameters: true },
  });
  const headers = {
    authorization: `Bearer ${key}`,
    'content-type': 'application/json',
    'http-referer': 'https://watermark.how',
    'x-title': 'watermark.how demo',
  };

  // Retry up to 3 times on 429 with exponential backoff.
  let upstream: Response | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST', headers, body,
    });
    if (upstream.status !== 429) break;
    const wait = (attempt + 1) * 800;
    await new Promise((r) => setTimeout(r, wait));
  }
  if (!upstream!.ok) {
    const detail = (await upstream!.text().catch(() => '')).slice(0, 300);
    return res.status(upstream!.status === 429 ? 429 : 502).json({ error: `upstream ${upstream!.status}: ${detail}` });
  }
  const data = (await upstream.json()) as {
    choices?: { logprobs?: { content?: { top_logprobs?: TopLogprob[] }[] } }[];
  };
  const top = (data.choices?.[0]?.logprobs?.content?.[0]?.top_logprobs ?? []).map((t) => ({
    token: t.token,
    logprob: t.logprob,
  }));
  return res.status(200).json({ top });
}
