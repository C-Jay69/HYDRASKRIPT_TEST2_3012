/**
 * Manuscript Chunking Utility
 * Handles chunking large manuscripts into processable pieces
 */

export interface ChunkOptions {
  maxChunkSize?: number;      // Maximum characters per chunk
  overlapSize?: number;       // Overlap between chunks
  preserveParagraphs?: boolean; // Keep paragraphs together
}

export interface Chunk {
  id: string;
  index: number;
  content: string;
  charCount: number;
  wordCount: number;
}

export class ManuscriptChunker {
  private maxChunkSize: number;
  private overlapSize: number;
  private preserveParagraphs: boolean;

  constructor(options: ChunkOptions = {}) {
    this.maxChunkSize = options.maxChunkSize || 15000; // ~4000 tokens
    this.overlapSize = options.overlapSize || 500;     // ~150 tokens overlap
    this.preserveParagraphs = options.preserveParagraphs ?? true;
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(w => w.length > 0).length;
  }

  /**
   * Find best break point to preserve paragraph integrity
   */
  private findBreakPoint(text: string, startPos: number): number {
    if (startPos >= text.length) {
      return text.length;
    }

    // Look for paragraph breaks first
    let paragraphBreak = text.indexOf('\n\n', startPos);
    if (paragraphBreak !== -1 && paragraphBreak < startPos + this.maxChunkSize) {
      return paragraphBreak + 2;
    }

    // Look for sentence breaks
    const sentenceEndings = ['. ', '! ', '? '];
    let bestSentenceBreak = -1;

    for (const ending of sentenceEndings) {
      let pos = startPos;
      while ((pos = text.indexOf(ending, pos)) !== -1 && pos < startPos + this.maxChunkSize) {
        bestSentenceBreak = pos + 2;
        pos++;
      }
    }

    if (bestSentenceBreak !== -1) {
      return bestSentenceBreak;
    }

    // Fall back to line break
    let lineBreak = text.indexOf('\n', startPos);
    if (lineBreak !== -1 && lineBreak < startPos + this.maxChunkSize) {
      return lineBreak + 1;
    }

    // Fall back to word boundary
    let wordBreak = startPos + this.maxChunkSize;
    while (wordBreak < text.length && text[wordBreak] !== ' ' && wordBreak > startPos) {
      wordBreak--;
    }

    return Math.min(wordBreak, text.length);
  }

  /**
   * Create overlap from previous chunk
   */
  private createOverlap(text: string, chunkIndex: number): string {
    if (chunkIndex === 0) {
      return '';
    }

    const startPos = Math.max(0, text.length - this.overlapSize);
    return text.substring(startPos);
  }

  /**
   * Clean and normalize text
   */
  private cleanText(text: string): string {
    // Remove excessive whitespace
    let cleaned = text.replace(/\s+/g, ' ').trim();

    // Restore paragraph breaks
    cleaned = cleaned.replace(/\. /g, '.\n\n');

    return cleaned;
  }

  /**
   * Split text into chunks
   */
  public chunk(text: string): Chunk[] {
    const cleanedText = this.cleanText(text);
    const chunks: Chunk[] = [];
    let chunkIndex = 0;
    let currentPos = 0;
    let previousEnd = 0;

    while (currentPos < cleanedText.length) {
      let startPos = currentPos;

      // Add overlap if not first chunk
      if (chunkIndex > 0 && previousEnd > 0) {
        const overlapText = cleanedText.substring(
          Math.max(0, previousEnd - this.overlapSize),
          previousEnd
        );
        startPos = Math.max(0, previousEnd - this.overlapSize);
      }

      // Find end of chunk
      let endPos = this.findBreakPoint(cleanedText, startPos);
      const chunkContent = cleanedText.substring(startPos, endPos);

      chunks.push({
        id: `chunk_${chunkIndex}`,
        index: chunkIndex,
        content: chunkContent,
        charCount: chunkContent.length,
        wordCount: this.countWords(chunkContent),
      });

      previousEnd = endPos;
      currentPos = endPos;
      chunkIndex++;
    }

    return chunks;
  }

  /**
   * Estimate total processing time based on chunks
   */
  public estimateProcessingTime(chunkCount: number): {
    minutes: number;
    seconds: number;
  } {
    // Assume 30 seconds per chunk with retries
    const totalSeconds = chunkCount * 30;
    return {
      minutes: Math.floor(totalSeconds / 60),
      seconds: totalSeconds % 60,
    };
  }

  /**
   * Validate chunk size is appropriate
   */
  public validateChunk(chunk: Chunk): {
    valid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    if (chunk.content.length > this.maxChunkSize + this.overlapSize) {
      issues.push('Chunk exceeds maximum size');
    }

    if (chunk.content.length === 0) {
      issues.push('Chunk is empty');
    }

    if (chunk.wordCount < 10) {
      issues.push('Chunk has too few words');
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }
}

/**
 * Utility function to chunk text with default options
 */
export function chunkManuscript(
  text: string,
  options?: ChunkOptions
): Chunk[] {
  const chunker = new ManuscriptChunker(options);
  return chunker.chunk(text);
}

/**
 * Extract text from common document formats
 * (Placeholder - would need proper implementations)
 */
export async function extractTextFromFile(
  file: File | Buffer
): Promise<string> {
  // For now, assume text/plain or return base text
  if (file instanceof File) {
    if (file.type === 'text/plain') {
      return file.text();
    }

    // Add support for other formats as needed
    // PDF, DOCX, etc.
    throw new Error(`Unsupported file type: ${file.type}`);
  }

  // Handle Buffer
  if (Buffer.isBuffer(file)) {
    return file.toString('utf-8');
  }

  throw new Error('Invalid file format');
}
