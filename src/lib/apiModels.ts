// The API-backend dropdown. Every entry must support top_logprobs on
// OpenRouter (see scripts/list-logprobs-models.mjs to re-derive the pool);
// the serverless proxy also enforces this allowlist.

export interface ApiModel {
  id: string;
  label: string;
  free: boolean;
}

export const API_MODELS: ApiModel[] = [
  { id: 'xiaomi/mimo-v2.5', label: 'MiMo v2.5', free: false },
  { id: 'inclusionai/ling-2.6-flash', label: 'Ling 2.6 Flash', free: false },
  { id: 'mistralai/mistral-nemo', label: 'Mistral Nemo', free: false },
  { id: 'liquid/lfm-2.5-2.6b:free', label: 'LFM 2.5 2.6B (free, slow)', free: true },
  { id: 'inclusionai/ling-3.0-tiny:free', label: 'Ling 3.0 Tiny (free, slow)', free: true },
  { id: 'google/gemma-4-26b-a4b-it:free', label: 'Gemma 4 26B (free, slow)', free: true },
  { id: 'openai/gpt-oss-20b:free', label: 'GPT-OSS 20B (free, slow)', free: true },
];
