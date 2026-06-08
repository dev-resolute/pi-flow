import { findPipeline } from "./pipelines.js";

export interface DetectionResult {
  complete: boolean;
  artifacts: string[];
  matchedSignal?: string;
}

const ANTI_SIGNALS = [
  "not yet complete",
  "still working on",
  "need more information",
  "waiting for",
  "not done",
  "let me continue",
];

function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function containsSignal(message: string, signal: string): boolean {
  const normalizedMsg = message.toLowerCase();
  const normalizedSignal = signal.toLowerCase();
  
  if (normalizedMsg.includes(normalizedSignal)) {
    return true;
  }
  
  const signalWords = normalizedSignal.split(/\s+/).map(normalizeWord).filter(w => w.length > 0);
  const msgWords = normalizedMsg.split(/\s+/).map(normalizeWord).filter(w => w.length > 0);
  let msgIdx = 0;
  
  for (const word of signalWords) {
    const foundIdx = msgWords.indexOf(word, msgIdx);
    if (foundIdx === -1) return false;
    msgIdx = foundIdx + 1;
  }
  
  return true;
}

export function detectCompletion(
  message: string,
  stageId: string,
  pipelineId: string,
): DetectionResult {
  const pipeline = findPipeline(pipelineId);
  if (!pipeline) return { complete: false, artifacts: [] };

  const stage = pipeline.stages.find((s) => s.id === stageId);
  if (!stage) return { complete: false, artifacts: [] };

  for (const anti of ANTI_SIGNALS) {
    if (containsSignal(message, anti)) {
      return { complete: false, artifacts: [] };
    }
  }

  for (const signal of stage.completionSignals) {
    if (containsSignal(message, signal)) {
      return { complete: true, artifacts: [], matchedSignal: signal };
    }
  }

  return { complete: false, artifacts: [] };
}
