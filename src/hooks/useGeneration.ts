// The demo engine: a requestAnimationFrame loop drives one watermarked
// generation step per 1/speed seconds. Temperature and speed apply live;
// key, k, prompt or model changes reset the run (they invalidate scoring).

import { useCallback, useEffect, useRef, useState } from 'react';
import { topCandidates } from '../lib/candidates';
import type { Candidate } from '../lib/candidates';
import { contribution, summarize } from '../lib/detector';
import type { DetectionResult, TokenScore } from '../lib/detector';
import { hexToBytes, importHmacKey } from '../lib/prf';
import { sampleWatermarked } from '../lib/sampler';
import { nextStep } from '../lib/step';
import { knownIds } from '../lib/trigram';
import type { TrigramModel } from '../lib/trigram';

export interface CommittedToken {
  id: number;
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
  atCapacity: boolean;
  play: () => void;
  pause: () => void;
  stepOnce: () => void;
  reset: () => void;
}

const MAX_TOKENS = 500;

export function useGeneration(
  model: TrigramModel | null,
  keyHex: string,
  prompt: string,
  k: number,
  temperature: number,
  speed: number,
): Generation {
  const [tokens, setTokens] = useState<CommittedToken[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [result, setResult] = useState<DetectionResult>(() => summarize([]));
  const [running, setRunning] = useState(false);

  const historyRef = useRef<number[]>([]);
  const scoresRef = useRef<TokenScore[]>([]);
  const keyRef = useRef<CryptoKey | null>(null);
  const busyRef = useRef(false);
  const liveRef = useRef({ k, temperature, speed });
  liveRef.current = { k, temperature, speed };

  const reset = useCallback(() => {
    keyRef.current = null;
    historyRef.current = model ? knownIds(model, prompt) : [];
    scoresRef.current = [];
    setTokens([]);
    setCandidates([]);
    setResult(summarize([]));
  }, [model, prompt]);

  useEffect(() => reset(), [reset, keyHex, k]);

  const doStep = useCallback(async () => {
    if (!model || busyRef.current || scoresRef.current.length >= MAX_TOKENS) return;
    busyRef.current = true;
    try {
      if (!keyRef.current) keyRef.current = await importHmacKey(hexToBytes(keyHex));
      const { k: liveK, temperature: liveT } = liveRef.current;
      const step = await nextStep(model, keyRef.current, historyRef.current, liveK, liveT, sampleWatermarked);
      const { tokenId, probs, r, entropy } = step;
      if (!r) throw new Error('watermarked sampler returned no r vector');
      historyRef.current.push(tokenId);
      scoresRef.current.push({ tokenId, r: r[tokenId], contribution: contribution(r[tokenId]) });
      setCandidates(topCandidates(model, probs, r, tokenId, 8));
      setTokens((prev) => [
        ...prev,
        { id: tokenId, text: model.vocab[tokenId], r: r[tokenId], p: probs[tokenId], contribution: contribution(r[tokenId]), entropy },
      ]);
      setResult(summarize([...scoresRef.current]));
    } finally {
      busyRef.current = false;
    }
  }, [model, keyHex]);

  useEffect(() => {
    if (!running || !model) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      if (now - last >= 1000 / liveRef.current.speed && !busyRef.current) {
        last = now;
        void doStep();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, model, doStep]);

  const atCapacity = tokens.length >= MAX_TOKENS;
  useEffect(() => {
    if (atCapacity) setRunning(false);
  }, [atCapacity]);

  return {
    tokens,
    candidates,
    result,
    running,
    atCapacity,
    play: () => setRunning(true),
    pause: () => setRunning(false),
    stepOnce: () => void doStep(),
    reset: () => {
      setRunning(false);
      reset();
    },
  };
}
