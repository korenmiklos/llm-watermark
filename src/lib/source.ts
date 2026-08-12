// A backend is anything that yields a next-token distribution: a local
// transformer or an API that reveals top-20 logprobs.

export interface StepDistribution {
  // Candidate token texts, aligned with probs. May be the full vocabulary
  // (local backends) or a truncated top-k (API backends).
  tokens: string[];
  // Post-temperature probabilities, renormalized to sum to 1.
  probs: Float64Array;
  // True when this is a top-k slice of a larger distribution — sampling is
  // then distortion-free within the slice, not the full vocabulary.
  truncated: boolean;
}

export interface ProbabilitySource {
  id: string;
  label: string;
  // How committed tokens are joined for display: 'space' for word-level
  // vocabularies, 'raw' for BPE-style pieces that carry their own spacing.
  joiner: 'space' | 'raw';
  // Optional tokenizer access for editing and rescoring generated text.
  encode?: (text: string) => string[];
  decode?: (tokens: readonly string[]) => string;
  next(promptText: string, generated: readonly string[], temperature: number): Promise<StepDistribution>;
}
