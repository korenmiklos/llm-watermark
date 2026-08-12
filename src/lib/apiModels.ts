// The API-backend dropdown. Every entry must support top_logprobs on
// OpenRouter (see scripts/list-logprobs-models.mjs to re-derive the pool);
// the serverless proxy also enforces this allowlist.

export interface ApiModel {
  id: string;
  label: string;
  free: boolean;
}

export const API_MODELS: ApiModel[] = [
  { id: 'google/gemma-3-27b-it', label: 'Gemma 3 27B', free: false },
  { id: 'mistralai/mistral-nemo', label: 'Mistral Nemo', free: false },
  { id: 'google/gemma-4-26b-a4b-it:free', label: 'Gemma 4 26B (free, slow)', free: true },
];
