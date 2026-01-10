
import ZAI from 'z-ai-web-dev-sdk';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

export interface AudioGenerationOptions {
  text: string;
  voice?: string; // "alloy", "echo", "fable", "onyx", "nova", "shimmer" (OpenAI) or "tongtong" (ZAI)
  speed?: number;
  bookId: string;
  pageId?: string;
}

export interface GeneratedAudio {
  success: boolean;
  audioUrl?: string;
  text: string;
  voice?: string;
  error?: string;
}

class AudioGenerator {
  private zai: ZAI | null = null;
  private outputDir: string;

  constructor(outputDir = './public/generated-audio') {
    this.outputDir = outputDir;

    // Ensure output directory exists
    if (!existsSync(this.outputDir)) {
      mkdirSync(this.outputDir, { recursive: true });
    }
  }

  private async initialize(): Promise<void> {
    if (!this.zai) {
      this.zai = await ZAI.create();
    }
  }

  /**
   * Generate audio for a specific text
   */
  async generateAudio(options: AudioGenerationOptions): Promise<GeneratedAudio> {
    try {
      await this.initialize();

      const voice = options.voice || 'alloy';
      const speed = options.speed || 1.0;

      // Use direct fetch to hit the correct Zhipu AI /audio/speech endpoint
      // The SDK uses /audio/tts which might be incorrect or legacy for Zhipu
      console.log("Using custom fetch for Audio...");
      const config = (this.zai as any).config;
      const baseUrl = config.baseUrl;
      const apiKey = config.apiKey;
      
      const url = `${baseUrl}/audio/speech`;
      
      const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            // model: "glm-4-voice", // Omit model to use default (which works)
            input: options.text,
            // voice: "neon", // Omit voice as specific IDs fail
            speed: speed,
            response_format: "wav",
          }),
        });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`TTS API request failed with status ${response.status}: ${errorText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const filename = `${options.bookId}_${options.pageId || 'full'}_${Date.now()}.wav`;
      const filepath = join(this.outputDir, filename);
      writeFileSync(filepath, buffer);

      return {
        success: true,
        audioUrl: `/generated-audio/${filename}`,
        text: options.text,
        voice: voice,
      };
    } catch (error: any) {
      console.error('Audio generation error:', error);
      return {
        success: false,
        text: options.text,
        voice: options.voice,
        error: error?.message || 'Audio generation failed',
      };
    }
  }
}

// Singleton instance
let generatorInstance: AudioGenerator | null = null;

export function getAudioGenerator(): AudioGenerator {
  if (!generatorInstance) {
    generatorInstance = new AudioGenerator();
  }
  return generatorInstance;
}

/**
 * Generate audio for a book page
 */
export async function generateBookAudio(
  options: AudioGenerationOptions
): Promise<GeneratedAudio> {
  const generator = getAudioGenerator();
  return generator.generateAudio(options);
}
