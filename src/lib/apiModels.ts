// The API-backend dropdown. Every entry must support top_logprobs on
// OpenRouter (see scripts/list-logprobs-models.mjs to re-derive the pool);
// the serverless proxy also enforces this allowlist.

export interface ApiModel {
  id: string;
  label: string;
  free: boolean;
}

export const API_MODELS: ApiModel[] = [
  { id: 'meta-llama/llama-3.1-8b-instruct', label: 'Llama 3.1 8B', free: false },
  { id: 'google/gemma-4-26b-a4b-it', label: 'Gemma 4 26B', free: false },
];
