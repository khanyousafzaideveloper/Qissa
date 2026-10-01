/**
 * Split text into sentences for narration.
 * Handles English punctuation (. ! ?) and Urdu punctuation (۔ ؟).
 * Each chunk is capped at ~180 characters because Chrome stops long utterances.
 */

// Sentence-ending punctuation: English and Urdu
const SENTENCE_ENDINGS = /[.!?۔؟]+/;

/**
 * Split text into sentences.
 * Keeps punctuation with the sentence.
 */
export function splitIntoSentences(text: string): string[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  // Split on sentence boundaries while keeping punctuation
  const sentences = text
    .split(SENTENCE_ENDINGS)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return sentences;
}

/**
 * Split text into chunks for narration.
 * Each chunk is at most ~180 characters (to avoid Chrome truncation).
 * If a sentence is longer than 180 chars, split it by commas.
 */
export function chunkText(text: string, maxChunkLength = 180): string[] {
  const sentences = splitIntoSentences(text);
  const chunks: string[] = [];

  for (const sentence of sentences) {
    if (sentence.length <= maxChunkLength) {
      chunks.push(sentence);
    } else {
      // Long sentence: split by commas or other natural breaks
      const subChunks = splitLongSentence(sentence, maxChunkLength);
      chunks.push(...subChunks);
    }
  }

  return chunks.filter((c) => c.length > 0);
}

/**
 * Split a long sentence by commas or spaces.
 * Tries to keep chunks close to maxChunkLength without exceeding it.
 */
function splitLongSentence(
  sentence: string,
  maxChunkLength: number,
): string[] {
  if (sentence.length <= maxChunkLength) {
    return [sentence];
  }

  const chunks: string[] = [];
  let currentChunk = '';

  // Split on commas first (Urdu: ،، English: ,)
  const commaParts = sentence.split(/[،,]/);

  for (const part of commaParts) {
    const trimmedPart = part.trim();
    if (!trimmedPart) continue;

    if (
      currentChunk.length === 0 ||
      currentChunk.length + trimmedPart.length + 1 <= maxChunkLength
    ) {
      // Add to current chunk
      if (currentChunk.length > 0) {
        currentChunk += ', ';
      }
      currentChunk += trimmedPart;
    } else {
      // Start a new chunk
      if (currentChunk.length > 0) {
        chunks.push(currentChunk);
      }
      currentChunk = trimmedPart;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  // If still too long, split by spaces as last resort
  return chunks.flatMap((chunk) => {
    if (chunk.length <= maxChunkLength) {
      return [chunk];
    }

    const words = chunk.split(/\s+/);
    const subChunks: string[] = [];
    let subChunk = '';

    for (const word of words) {
      if (
        subChunk.length === 0 ||
        subChunk.length + word.length + 1 <= maxChunkLength
      ) {
        if (subChunk.length > 0) {
          subChunk += ' ';
        }
        subChunk += word;
      } else {
        if (subChunk.length > 0) {
          subChunks.push(subChunk);
        }
        subChunk = word;
      }
    }

    if (subChunk.length > 0) {
      subChunks.push(subChunk);
    }

    return subChunks;
  });
}
