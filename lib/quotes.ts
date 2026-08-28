const FOCUS_QUOTES = [
  "Make the next ten minutes easy to begin.",
  "A small clear step is still a step forward.",
  "Let the room be quiet enough for the work to speak.",
  "You do not need a perfect session to make progress.",
  "Keep the promise small: stay with this one thing.",
  "Begin gently. Continue honestly.",
] as const;

export function getQuoteForDate(day: string): string {
  const seed = Array.from(day).reduce((total, character) => total + character.charCodeAt(0), 0);
  return FOCUS_QUOTES[seed % FOCUS_QUOTES.length];
}
