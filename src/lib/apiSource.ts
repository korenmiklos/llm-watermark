// An OpenRouter-backed ProbabilitySource. Each step asks the serverless
// proxy for one token's top-20 logprobs; temperature is applied locally
// over that slice, so sampling is distortion-free within the top-20.

import type { ProbabilitySource, StepDistribution } from './source';

const API_BASE: string = import.meta.env.VITE_API_BASE ?? '/api';
// Per-page-load budget: one API call per generated token.
const SESSION_TOKEN_BUDGET = 600;
let used = 0;

export function apiTokensRemaining(): number {
  return Math.max(0, SESSION_TOKEN_BUDGET - used);
}

interface StepResponse {
  top: { token: string; logprob: number }[];
}

export function apiSource(id: string, label: string): ProbabilitySource {
  return {
    id,
    label,
    joiner: 'raw',
    async next(promptText, generated, temperature): Promise<StepDistribution> {
      if (used >= SESSION_TOKEN_BUDGET) {
        throw new Error(`session budget of ${SESSION_TOKEN_BUDGET} API tokens reached — reload the page to continue`);
      }
      const res = await fetch(`${API_BASE}/step`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model: id, prompt: promptText, generated: generated.join('') }),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(detail.slice(0, 200) || `API error ${res.status}`);
      }
      used += 1;
      const { top } = (await res.json()) as StepResponse;
      if (!top || top.length === 0) {
        return { tokens: [], probs: new Float64Array(0), truncated: true };
      }
      const maxLp = top.reduce((m, t) => Math.max(m, t.logprob), -Infinity);
      const weights = top.map((t) => Math.exp((t.logprob - maxLp) / temperature));
      const z = weights.reduce((a, b) => a + b, 0);
      return {
        tokens: top.map((t) => t.token),
        probs: Float64Array.from(weights, (w) => w / z),
        truncated: true,
      };
    },
  };
}
