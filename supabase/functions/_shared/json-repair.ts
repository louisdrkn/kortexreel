import JSON5 from "https://esm.sh/json5@2.2.3";

/**
 * Tries to repair and parse a malformed JSON string (e.g. from an LLM).
 * 1. Extracts JSON block if embedded in text (```json ... ``` or just {...})
 * 2. Uses JSON5 to handle trailing commas, comments, etc.
 * 3. Returns fallback if parsing fails.
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
      // If both present, pick the one that starts earlier or is longer?
      // Usually LLM output is either an object or array.
      // Let's check indices.
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

  // 2. PARSE WITH ROBUSTNESS
  try {
    // Try standard JSON first for speed
    return JSON.parse(cleaned) as T;
  } catch (_e) {
    try {
      // Try JSON5 for lenient parsing (trailing commas, etc.)
      return JSON5.parse(cleaned) as T;
    } catch (_e2) {
      console.warn(
        "Failed to parse JSON even with repair strategies:",
        input.slice(0, 100) + "...",
      );
      return fallback ?? null;
    }
  }
}
