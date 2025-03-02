import fs from 'fs';
import { PDFExtract } from 'pdf.js-extract';

const pdfExtract = new PDFExtract();

/**
 * Extract text from a PDF using pdf.js-extract with improved filtering
 */
export async function parsePdf(pdfPath: string): Promise<string> {
  try {
    console.log(`Attempting to read PDF from: ${pdfPath}`);
    
    if (!fs.existsSync(pdfPath)) {
      throw new Error(`PDF file not found at path: ${pdfPath}`);
    }
    
    const options = {
      // Set any specific options here
      normalizeWhitespace: true,
      disableCombineTextItems: false
    };
    
    const data = await pdfExtract.extract(pdfPath, options);
    
    // Process and clean the text content
    const cleanedText = data.pages
      .map(page => {
        // Sort content by y position to maintain reading order
        const sortedContent = [...page.content].sort((a, b) => {
          // Group items by approximate y position (within 5 units)
          const yDiff = Math.abs(a.y - b.y);
          if (yDiff < 5) {
            // If on same line, sort by x position
            return a.x - b.x;
          }
          return a.y - b.y;
        });
        
        // Filter out non-text elements and clean the text
        return sortedContent
          .map(item => {
            // Skip items that are likely not regular text
            if (!item.str || item.str.trim() === '') return '';
            
            // Clean the text
            return item.str.trim()
              // Replace special characters
              .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
              // Normalize spaces
              .replace(/\s+/g, ' ');
          })
          .filter(text => text.length > 0) // Remove empty strings
          .join(' ');
      })
      .join('\n\n')
      // Remove any remaining problematic characters
      .replace(/[^\x20-\x7E\n\r\t]/g, '')
      // Fix multiple newlines
      .replace(/\n{3,}/g, '\n\n');
    
    return cleanedText;
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw error;
  }
}