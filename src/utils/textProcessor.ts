/**
 * Splits text into optimally-sized chunks for glasses display
 * @param text The text to chunk
 * @returns Array of text chunks
 */
export function chunkText(text: string): string[] {
  // First, clean the text by removing line numbers
  const cleanedText = text
    .split('\n')
    .map(line => line.replace(/^\d+\|/, ''))
    .join('\n');
  
  // Split into paragraphs first
  const paragraphs = cleanedText.split(/\n\s*\n/);
  
  // Now create appropriately sized chunks for each paragraph
  const chunks: string[] = [];
  
  for (const paragraph of paragraphs) {
    // Skip empty paragraphs
    if (paragraph.trim().length === 0) continue;
    
    // Split paragraph into sentences
    const sentences = paragraph
      .replace(/([.!?])\s+/g, "$1|")
      .split("|");
    
    let currentChunk = "";
    
    // Process each sentence
    for (const sentence of sentences) {
      // Skip empty sentences
      if (sentence.trim().length === 0) continue;
      
      const sentenceWords = sentence.trim().split(/\s+/).length;
      
      // If adding this sentence would make the chunk too large, start a new chunk
      if (currentChunk.split(/\s+/).length + sentenceWords > 30 && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = "";
      }
      
      // Add the sentence to the current chunk
      if (currentChunk.length > 0) {
        currentChunk += " ";
      }
      currentChunk += sentence.trim();
    }
    
    // Add the last chunk if it's not empty
    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }
  }
  
  return chunks;
} 