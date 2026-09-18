// Splits text into overlapping, word-safe chunks.
// Tries to preserve complete sentences while keeping
// enough overlap between chunks for context.

export function chunkText(text, chunkSize = 1000, overlap = 150) {
  const cleaned = text.replace(/\s+/g, ' ').trim();

  if (!cleaned) {
    return [];
  }

  const chunks = [];
  let start = 0;

  while (start < cleaned.length) {
    let end = Math.min(start + chunkSize, cleaned.length);

    // If this is not the last chunk, find a good boundary.
    if (end < cleaned.length) {
      // Prefer a sentence-ending punctuation mark.
      const sentenceEnd = Math.max(
        cleaned.lastIndexOf('.', end),
        cleaned.lastIndexOf('!', end),
        cleaned.lastIndexOf('?', end)
      );

      if (sentenceEnd > start + chunkSize * 0.6) {
        end = sentenceEnd + 1;
      } else {
        // Otherwise, end at a whitespace boundary.
        const space = cleaned.lastIndexOf(' ', end);

        if (space > start) {
          end = space;
        }
      }
    }

    const chunk = cleaned.slice(start, end).trim();

    if (chunk) {
      chunks.push(chunk);
    }

    if (end >= cleaned.length) {
      break;
    }

    // Move backwards for overlap, then make sure the new
    // chunk starts at the beginning of a word.
    start = Math.max(0, end - overlap);

    while (start > 0 && cleaned[start - 1] !== ' ') {
      start++;
    }
  }

  return chunks;
}