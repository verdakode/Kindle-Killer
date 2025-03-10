import { TpaServer, TpaSession } from '@augmentos/sdk';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
import { chunkText } from './src/utils/textProcessor';

class ExampleAugmentOSApp extends TpaServer {
  // Track state
  private lastTranscriptionTime: number = 0;
  private isDisplayingPdf: boolean = false;
  private currentChunkIndex: number = 0;
  private pdfChunks: string[] = [];
  private autoAdvanceTimer: NodeJS.Timeout | null = null;
  private isAutoAdvancing: boolean = false;

  // Add speed control properties
  private readingSpeed: number = 5000; // Default speed (ms per chunk)
  private overlapTime: number = 1800; // Default overlap time

  protected async onSession(session: TpaSession, sessionId: string, userId: string): Promise<void> {
    // Show welcome message
    session.layouts.showTextWall("Text Reader App Ready!");
    
    // Load the text file
    try {
      const textFilePath = path.resolve(__dirname, 'I, Robot (Isaac Asimov) (Z-Library).txt');
      console.log('Current directory:', process.cwd());
      console.log('__dirname:', __dirname);
      console.log('Resolved text file path:', textFilePath);
      console.log('File exists:', fs.existsSync(textFilePath));
      
      // Read the text file
      let text = fs.readFileSync(textFilePath, 'utf8');
      console.log(`Read ${text.length} characters from text file`);
      
      // Clean up the text but preserve line breaks and formatting
      // Remove any non-printable characters
      text = text.replace(/[^\x20-\x7E\n\r\t]/g, '');
      
      // Chunk the text while preserving line breaks
      this.pdfChunks = chunkText(text, 2000, 200); // Increased chunk size for better reading
      console.log(`Created ${this.pdfChunks.length} chunks from text file`);
      
      // DEBUG: Print the first chunk to verify content
      if (this.pdfChunks.length > 0) {
        console.log("\n\n========== FIRST CHUNK CONTENT START ==========");
        console.log(this.pdfChunks[0]);
        console.log("========== FIRST CHUNK CONTENT END ==========\n\n");
      }
      
      // Display first chunk
      if (this.pdfChunks.length > 0) {
        this.isDisplayingPdf = true;
        session.layouts.showTextWall("Starting text presentation. Auto-advancing through chunks. Say 'stop' to pause.", {
          durationMs: 5000
        });
        this.displayPdfChunk(session);
        
        // Start auto-advancing immediately
        this.startAutoAdvance(session);
      }
    } catch (error) {
      console.error('Error loading text file:', error);
      session.layouts.showTextWall("Error loading text file. Please try again.");
    }

    // Handle real-time transcription
    const cleanup = [
      session.events.onTranscription((data) => {
        const currentTime = Date.now();
        this.lastTranscriptionTime = currentTime;

        // Process final transcriptions
        if (data.isFinal) {
          const lowerText = data.text.toLowerCase();
          
          // Check for navigation commands
          if (this.isDisplayingPdf) {
            if (lowerText.includes('auto') || lowerText.includes('play') || lowerText.includes('start reading')) {
              // Start auto-advancing through chunks
              this.startAutoAdvance(session);
              session.layouts.showTextWall("Auto-advancing through text. Say 'pause' to stop.", {
                durationMs: 3000
              });
            } else if (lowerText.includes('faster') || lowerText.includes('speed up') || lowerText.includes('go faster')) {
              // Increase reading speed
              this.adjustReadingSpeed(session, -500); // Reduce time between chunks
            } else if (lowerText.includes('slower') || lowerText.includes('slow down') || lowerText.includes('go slower')) {
              // Decrease reading speed
              this.adjustReadingSpeed(session, 500); // Increase time between chunks
            } else if (lowerText.includes('next') || lowerText.includes('continue')) {
              // Stop auto-advance if it's running
              this.stopAutoAdvance();
              
              // Manually go to next chunk
              this.currentChunkIndex++;
              if (this.currentChunkIndex >= this.pdfChunks.length) {
                this.currentChunkIndex = this.pdfChunks.length - 1;
                session.layouts.showTextWall("End of document reached.");
              } else {
                this.displayPdfChunk(session);
              }
            } else if (lowerText.includes('previous') || lowerText.includes('back')) {
              // Stop auto-advance if it's running
              this.stopAutoAdvance();
              
              this.currentChunkIndex--;
              if (this.currentChunkIndex < 0) {
                this.currentChunkIndex = 0;
                session.layouts.showTextWall("Already at the beginning of document.");
              } else {
                this.displayPdfChunk(session);
              }
            } else if (lowerText.includes('stop') || lowerText.includes('exit') || 
                      lowerText.includes('pause') || lowerText.includes('transcribe')) {
              // Stop auto-advance if it's running
              this.stopAutoAdvance();
              
              this.isDisplayingPdf = false;
              session.layouts.showTextWall("Text reading paused. Now in transcription mode. Say 'resume text' to continue reading.", {
                durationMs: 5000
              });
            } else if (lowerText.includes('restart')) {
              // Stop auto-advance if it's running
              this.stopAutoAdvance();
              
              this.currentChunkIndex = 0;
              this.displayPdfChunk(session);
            }
            // Ignore all other transcriptions when in text mode
          } else {
            // Not currently displaying text - in transcription mode
            if (lowerText.includes('start text') || lowerText.includes('resume text') || 
                lowerText.includes('continue text') || lowerText.includes('read text') ||
                lowerText.includes('continue') || lowerText.includes('start')) {
              this.isDisplayingPdf = true;
              session.layouts.showTextWall("Resuming text reading from where you left off. Auto-advancing enabled.", {
                durationMs: 3000
              });
              
              // Start auto-advancing by default when resuming
              this.startAutoAdvance(session);
            } else {
              // Show the transcription
              session.layouts.showTextWall(data.text, {
                durationMs: 3000
              });
            }
          }

          // Log transcription for debugging
          console.log('Final transcription:', data.text);
        } else {
          // For non-final transcriptions, only show them if not displaying text
          if (!this.isDisplayingPdf) {
            session.layouts.showTextWall(data.text);
          }
        }
      }),

      session.events.onPhoneNotifications((data) => { }),

      session.events.onGlassesBattery((data) => { }),

      session.events.onError((error) => {
        console.error('Error:', error);
      }),

      // Add cleanup for timers when session ends
      () => {
        this.stopAutoAdvance();
      }
    ];

    // Add cleanup handlers
    cleanup.forEach(handler => this.addCleanupHandler(handler));
  }
  
  private displayPdfChunk(session: TpaSession): void {
    if (this.currentChunkIndex >= 0 && this.currentChunkIndex < this.pdfChunks.length) {
      const chunk = this.pdfChunks[this.currentChunkIndex];
      const progress = `[${this.currentChunkIndex + 1}/${this.pdfChunks.length}]`;
      
      // DEBUG: Print the chunk to the console
      console.log("\n\n========== CHUNK CONTENT START ==========");
      console.log(chunk);
      console.log("========== CHUNK CONTENT END ==========\n\n");
      
      // Display the chunk with progress indicator
      session.layouts.showTextWall(`${progress}\n\n${chunk}`, {
        durationMs: this.readingSpeed,
        preserveLineBreaks: true,
        preserveWhitespace: true
      });
      
      console.log(`Displaying chunk ${this.currentChunkIndex + 1}/${this.pdfChunks.length}`);
      
      // Set default reading speed for these medium-sized chunks
      if (this.readingSpeed === 3000) {
        this.readingSpeed = 5000; // Default to 5 seconds per chunk
        this.overlapTime = 1000;  // 1 second overlap
      }
      
      // Pre-load the next chunk to eliminate gaps
      if (this.isAutoAdvancing && this.currentChunkIndex < this.pdfChunks.length - 1) {
        setTimeout(() => {
          if (this.isAutoAdvancing) {
            this.currentChunkIndex++;
            this.displayPdfChunk(session);
          }
        }, this.overlapTime);
      }
    }
  }
  
  private startAutoAdvance(session: TpaSession): void {
    // Clear any existing timer
    this.stopAutoAdvance();
    
    // Set flag
    this.isAutoAdvancing = true;
    
    // Start displaying chunks immediately
    this.displayPdfChunk(session);
  }
  
  private stopAutoAdvance(): void {
    // Clear any interval timer
    if (this.autoAdvanceTimer) {
      clearInterval(this.autoAdvanceTimer);
      this.autoAdvanceTimer = null;
    }
    
    // Also clear any pending setTimeout callbacks
    // We can't directly cancel them, but we can set the flag to prevent them from continuing
    this.isAutoAdvancing = false;
    
    console.log('Auto-advance stopped at chunk', this.currentChunkIndex + 1);
  }

  // Fix the adjustReadingSpeed method
  private adjustReadingSpeed(session: TpaSession, adjustment: number): void {
    const oldSpeed = this.readingSpeed;
    
    // Adjust the reading speed
    this.readingSpeed = Math.max(500, Math.min(10000, this.readingSpeed + adjustment));
    
    // Adjust the overlap time to be slightly less than the reading speed
    this.overlapTime = Math.max(400, this.readingSpeed - 200);
    
    // Provide feedback about the speed change
    let speedMessage = "";
    if (adjustment < 0) {
      speedMessage = `Reading speed increased. Now showing each chunk for ${(this.readingSpeed/1000).toFixed(1)} seconds.`;
    } else {
      speedMessage = `Reading speed decreased. Now showing each chunk for ${(this.readingSpeed/1000).toFixed(1)} seconds.`;
    }
    
    session.layouts.showTextWall(speedMessage, {
      durationMs: 2000
    });
    
    console.log(`Reading speed adjusted from ${oldSpeed}ms to ${this.readingSpeed}ms`);
    
    // If we're currently auto-advancing, restart with the new speed
    if (this.isAutoAdvancing) {
      // Stop the current auto-advance
      this.stopAutoAdvance();
      
      // Wait a moment to show the speed change message
      setTimeout(() => {
        // Restart auto-advance with new speed
        this.startAutoAdvance(session);
      }, 2000);
    }
  }
}

// Start the server
// DEV CONSOLE URL: https://augmentos.dev/
// Get your webhook URL from ngrok (or whatever public URL you have)
const app = new ExampleAugmentOSApp({
  packageName: 'org.example.kindlekiller', // make sure this matches your app in dev console
  apiKey: 'your_api_key', // Not used right now, play nice
  port: 80, // The port you're hosting the server on
  augmentOSWebsocketUrl: 'wss://staging.augmentos.org/tpa-ws' //AugmentOS url
});

app.start().catch(console.error);
