/**
 * Tries to repair and parse a malformed JSON string (e.g. from an LLM).
 * 1. Extracts JSON block if embedded in text (```json ... ``` or just {...})
 * 2. Uses basic JSON.parse fallback.
 */
export function repairJson<T>(input: string, fallback?: T): T | null {
  if (!input || typeof input !== "string") {
    return fallback ?? null;
  }

  let cleaned = input.trim();

  // 1. EXTRACT JSON BLOCK
  // Try to find marked down JSON code blocks first
  const markdownMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (markdownMatch) {
    cleaned = markdownMatch[1].trim();
  } else {
    // If no markdown, try to find the outer-most object or array
    const objectMatch = cleaned.match(/\{[\s\S]*\}/);
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);

    if (objectMatch && arrayMatch) {
      if (objectMatch.index! < arrayMatch.index!) {
        cleaned = objectMatch[0];
      } else {
        cleaned = arrayMatch[0];
      }
    } else if (objectMatch) {
      cleaned = objectMatch[0];
    } else if (arrayMatch) {
      cleaned = arrayMatch[0];
    }
  }

  // 2. PARSE
  try {
    return JSON.parse(cleaned) as T;
  } catch (_e) {
    console.warn(
      "Failed to parse JSON:",
      input.slice(0, 100) + "...",
    );
    return fallback ?? null;
  }
}
