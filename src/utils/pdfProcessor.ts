import fs from 'fs';
import path from 'path';
import { parsePdf } from './pdfWrapper';

/**
 * Extracts text from a PDF file
 * @param pdfPath Path to the PDF file
 * @returns Promise resolving to the extracted text
 */
export async function extractTextFromPDF(pdfPath: string): Promise<string> {
  return await parsePdf(pdfPath);
}

/**
 * Splits text into chunks of approximately the specified size
 * @param text The text to chunk
 * @param chunkSize Target size of each chunk (in characters)
 * @param overlap Number of characters to overlap between chunks
 * @returns Array of text chunks
 */
export function chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
  const chunks: string[] = [];
  
  // Remove excessive whitespace and normalize
  const normalizedText = text.replace(/\s+/g, ' ').trim();
  
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
    
    // Try to find a good breaking point (sentence end or space)
    let breakPoint = normalizedText.lastIndexOf('. ', endIndex);
    if (breakPoint > startIndex + chunkSize / 2) {
      // Found a sentence end in the latter half of the chunk
      endIndex = breakPoint + 1; // Include the period
    } else {
      // Fall back to space
      breakPoint = normalizedText.lastIndexOf(' ', endIndex);
      if (breakPoint > startIndex) {
        endIndex = breakPoint;
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

/**
 * Process a PDF file and return chunked text
 * @param pdfPath Path to the PDF file
 * @param chunkSize Size of each chunk
 * @param overlap Overlap between chunks
 * @returns Promise resolving to an array of text chunks
 */
export async function processPDF(pdfPath: string, chunkSize: number = 1000, overlap: number = 200): Promise<string[]> {
  const text = await extractTextFromPDF(pdfPath);
  return chunkText(text, chunkSize, overlap);
} 