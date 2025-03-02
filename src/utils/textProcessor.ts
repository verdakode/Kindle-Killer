/**
 * Splits text into chunks of approximately the specified size
 * @param text The text to chunk
 * @param chunkSize Target size of each chunk (in characters)
 * @param overlap Number of characters to overlap between chunks
 * @returns Array of text chunks
 */
export function chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
  const chunks: string[] = [];
  
  // Normalize line endings and remove excessive whitespace
  const normalizedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\n+/g, '\n')
    .replace(/\t/g, '    ')
    .trim();
  
  if (normalizedText.length <= chunkSize) {
    return [normalizedText];
  }
  
  let startIndex = 0;
  
  while (startIndex < normalizedText.length) {
    let endIndex = Math.min(startIndex + chunkSize, normalizedText.length);
    
    if (endIndex >= normalizedText.length) {
      chunks.push(normalizedText.slice(startIndex));
      break;
    }
    
    // Try to find a good breaking point (paragraph, sentence, or space)
    let breakPoint = normalizedText.lastIndexOf('\n', endIndex);
    if (breakPoint > startIndex + (chunkSize / 2)) {
      // Found a paragraph break in the latter half of the chunk
      endIndex = breakPoint + 1;
    } else {
      // Try to find a sentence end
      breakPoint = normalizedText.lastIndexOf('. ', endIndex);
      if (breakPoint > startIndex + (chunkSize / 2)) {
        // Found a sentence end in the latter half of the chunk
        endIndex = breakPoint + 2; // Include the period and space
      } else {
        // Fall back to space
        breakPoint = normalizedText.lastIndexOf(' ', endIndex);
        if (breakPoint > startIndex) {
          endIndex = breakPoint + 1;
        }
      }
    }
    
    // Get the chunk and clean it
    const chunk = normalizedText.slice(startIndex, endIndex).trim();
    
    // Only add non-empty chunks
    if (chunk.length > 0) {
      chunks.push(chunk);
    }
    
    // Move start index for next chunk, accounting for overlap
    startIndex = endIndex - overlap;
    if (startIndex < 0) startIndex = 0;
  }
  
  return chunks;
} 