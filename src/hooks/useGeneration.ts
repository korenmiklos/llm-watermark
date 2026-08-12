// The demo engine: a requestAnimationFrame loop drives one watermarked
// generation step against any ProbabilitySource, firing as fast as the
// backend allows. Temperature applies live; source, key, k or prompt
// changes reset the run (they invalidate scoring).

import { useCallback, useEffect, useRef, useState } from 'react';
import { topCandidates } from '../lib/candidates';
import type { Candidate } from '../lib/candidates';
import { contribution, summarize } from '../lib/detector';
import type { DetectionResult, TokenScore } from '../lib/detector';
import { hexToBytes, importHmacKey } from '../lib/prf';
import { sampleWatermarked } from '../lib/sampler';
import type { ProbabilitySource } from '../lib/source';
import { nextStep } from '../lib/step';

export interface CommittedToken {
  text: string;
  r: number;
  p: number;
  contribution: number;
  entropy: number;
}

export interface Generation {
  tokens: CommittedToken[];
  candidates: Candidate[];
  result: DetectionResult;
  running: boolean;
  error: string | null;
  play: () => void;
  pause: () => void;
  stepOnce: () => void;
  reset: () => void;
}

const MAX_TOKENS = 500;

export function useGeneration(
  source: ProbabilitySource | null,
  keyHex: string,
  prompt: string,
  k: number,
  temperature: number,
): Generation {
  const [tokens, setTokens] = useState<CommittedToken[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [result, setResult] = useState<DetectionResult>(() => summarize([]));
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatedRef = useRef<string[]>([]);
  const scoresRef = useRef<TokenScore[]>([]);
  const keyRef = useRef<CryptoKey | null>(null);
  const busyRef = useRef(false);
  const liveRef = useRef({ k, temperature });
  liveRef.current = { k, temperature };

  const reset = useCallback(() => {
    keyRef.current = null;
    generatedRef.current = [];
    scoresRef.current = [];
    setTokens([]);
    setCandidates([]);
    setResult(summarize([]));
    setError(null);
  }, []);

  useEffect(() => reset(), [reset, source, keyHex, prompt, k]);

  const doStep = useCallback(async () => {
    if (!source || busyRef.current || scoresRef.current.length >= MAX_TOKENS) return;
    busyRef.current = true;
    try {
      if (!keyRef.current) keyRef.current = await importHmacKey(hexToBytes(keyHex));
      const { k: liveK, temperature: liveT } = liveRef.current;
      const outcome = await nextStep(source, keyRef.current, prompt, generatedRef.current, liveK, liveT, sampleWatermarked);
      if (!outcome) {
        setRunning(false);
        return;
      }
      const r = outcome.r[outcome.index];
      generatedRef.current.push(outcome.token);
      scoresRef.current.push({ token: outcome.token, r, contribution: contribution(r) });
      setCandidates(topCandidates(outcome));
      setTokens((prev) => [
        ...prev,
        { text: outcome.token, r, p: outcome.dist.probs[outcome.index], contribution: contribution(r), entropy: outcome.entropy },
      ]);
      setResult(summarize([...scoresRef.current]));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setRunning(false);
    } finally {
      busyRef.current = false;
    }
  }, [source, keyHex, prompt]);

  useEffect(() => {
    if (!running || !source) return;
    let raf = 0;
    const tick = () => {
      // Fire as fast as the backend allows; busyRef gates concurrency.
      if (!busyRef.current) {
        void doStep();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, source, doStep]);

  const atCapacity = tokens.length >= MAX_TOKENS;
  useEffect(() => {
    if (atCapacity) setRunning(false);
  }, [atCapacity]);

  return {
    tokens,
    candidates,
    result,
    running,
    error,
    play: () => {
      setError(null);
      setRunning(true);
    },
    pause: () => setRunning(false),
    stepOnce: () => void doStep(),
    reset: () => {
      setRunning(false);
      reset();
    },
  };
}
