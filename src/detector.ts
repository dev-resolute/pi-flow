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

  const signalWords = normalizedSignal.split(/\s+/).map(normalizeWord).filter((w) => w.length > 0);
  const msgWords = normalizedMsg.split(/\s+/).map(normalizeWord).filter((w) => w.length > 0);
  let msgIndex = 0;

  for (const word of signalWords) {
    const foundIndex = msgWords.indexOf(word, msgIndex);
    if (foundIndex === -1) return false;
    msgIndex = foundIndex + 1;
  }

  return true;
}

export function hasAntiSignal(message: string): boolean {
  return ANTI_SIGNALS.some((signal) => containsSignal(message, signal));
}
