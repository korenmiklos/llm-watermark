// Enumerate OpenRouter models whose supported_parameters include
// top_logprobs — the candidate pool for the API-backend model dropdown.
// Equivalent to https://openrouter.ai/models?supported_parameters=top_logprobs
//
// Caveat: supported_parameters is the union across an model's providers.
// At request time still send provider: { require_parameters: true } so
// routing never falls back to an endpoint that silently drops logprobs.

const res = await fetch('https://openrouter.ai/api/v1/models');
if (!res.ok) throw new Error(`openrouter models fetch failed: ${res.status}`);
const { data } = await res.json();

const perM = (x) => (Number(x ?? 0) * 1e6).toFixed(3);
const rows = data
  .filter((m) => m.supported_parameters?.includes('top_logprobs'))
  .map((m) => ({
    id: m.id,
    inPrice: perM(m.pricing?.prompt),
    outPrice: perM(m.pricing?.completion),
    ctx: m.context_length,
    free: m.id.endsWith(':free'),
  }))
  .sort((a, b) => a.inPrice - b.inPrice);

for (const r of rows) {
  const tag = r.free ? '  [FREE]' : '';
  console.log(`${r.id.padEnd(52)} $${r.inPrice}/M in  $${r.outPrice}/M out  ctx ${r.ctx}${tag}`);
}
console.log(`\n${rows.length} models support top_logprobs (of ${data.length} total)`);
