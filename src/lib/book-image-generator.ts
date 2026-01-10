/**
 * Book Image Generation Service
 * Handles image generation for different book categories
 */

import ZAI from 'z-ai-web-dev-sdk';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

export interface ImageGenerationOptions {
  prompt: string;
  style?: string; // disney, pixar, dreamworks, line_art, etc.
  size?: string;
  bookId: string;
  pageId?: string;
}

export interface GeneratedImage {
  success: boolean;
  imageUrl?: string;
  prompt: string;
  style?: string;
  error?: string;
}

class BookImageGenerator {
  private zai: ZAI | null = null;
  private outputDir: string;

  constructor(outputDir = './public/generated-images') {
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
   * Build a styled prompt based on category
   */
  private buildStyledPrompt(
    basePrompt: string,
    style: string = 'digital_art'
  ): string {
    const stylePrompts: Record<string, string> = {
      disney: 'Disney animation style, whimsical characters, bright colors, classic Disney aesthetic, hand-drawn look',
      pixar: 'Pixar 3D animation style, cute characters, expressive faces, vibrant colors, modern Pixar aesthetic, soft lighting',
      dreamworks: 'DreamWorks animation style, expressive characters, dynamic poses, detailed backgrounds, DreamWorks aesthetic',
      line_art: 'Black and white line art, clean lines, suitable for coloring, high contrast, simple outlines',
      watercolor: 'Watercolor painting style, soft edges, pastel colors, artistic hand-painted look',
      digital_art: 'Modern digital illustration, clean lines, vibrant colors, professional art style',
    };

    const styleDesc = stylePrompts[style] || stylePrompts.digital_art;
    return `${basePrompt}, ${styleDesc}, high quality, detailed`;
  }

  /**
   * Internal method to generate image using fetch
   */
  private async _generateImage(prompt: string, size: string): Promise<string> {
      // Use direct fetch for image generation to control endpoint and debugging
      const config = (this.zai as any).config;
      const baseUrl = config.baseUrl;
      const apiKey = config.apiKey;
      const url = `${baseUrl}/images/generations`;
      
      // Try cogview-4 specific version from community provider
      const model = "cogview-3-plus"; // Reverting to 3-plus as it's more likely stable, but maybe I need to check the exact string
      // Wait, 1211 means model not found. 
      // I'll try "cogview-3" again but maybe I need to be sure about the endpoint.
      // Actually, let's try "cogview-3" with the 1024x1024 size which I might have missed testing properly.
      // But wait, I'll try "cogview-4" if 3 fails?
      // Let's try "cogview-3-plus" but maybe the key is valid for "cogview-3"?
      // I'll try "cogview-3" with "1024x1024".
      // Use cogview-4-250304 as it is confirmed to exist (even if balance is low)
      const modelToUse = "cogview-4-250304"; 
      const sizeToUse = "1024x1024"; 
      console.log(`Generating image with model: ${modelToUse} via fetch to ${url}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelToUse,
          prompt: prompt,
          size: sizeToUse,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Image API request failed with status ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      
      if (result.data && result.data.length > 0) {
        const imageUrl = result.data[0].url;
        // Download and convert to base64
        const imageRes = await fetch(imageUrl);
        const buffer = await imageRes.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        return base64;
      }
      
      throw new Error('No image data returned from API');
  }

  /**
   * Generate an image for a coloring book page
   */
  async generatePageImage(options: ImageGenerationOptions, defaultStyle: string = 'digital_art'): Promise<GeneratedImage> {
    try {
      await this.initialize();

      const styledPrompt = this.buildStyledPrompt(options.prompt, options.style || defaultStyle);
      const size = options.size || '1152x864'; // 8x10 ratio

      const base64 = await this._generateImage(styledPrompt, size);
      const buffer = Buffer.from(base64, 'base64');

      const filename = `${options.bookId}_${options.pageId || 'page'}_${Date.now()}.png`;
      const filepath = join(this.outputDir, filename);
      writeFileSync(filepath, buffer);

      return {
        success: true,
        imageUrl: `/generated-images/${filename}`,
        prompt: options.prompt,
        style: options.style || defaultStyle,
      };
    } catch (error: any) {
      return {
        success: false,
        prompt: options.prompt,
        style: options.style,
        error: error?.message || 'Image generation failed',
      };
    }
  }

  // Alias for generateColoringPage if needed, or replace it
  async generateColoringPage(options: ImageGenerationOptions): Promise<GeneratedImage> {
      return this.generatePageImage(options, 'line_art');
  }

  /**
   * Generate an image for a kids story book page
   */
  async generateKidsStoryImage(options: ImageGenerationOptions): Promise<GeneratedImage> {
    try {
      await this.initialize();

      const styledPrompt = this.buildStyledPrompt(
        options.prompt,
        options.style || 'pixar'
      );
      const size = options.size || '1152x864'; // 8x10 ratio

      const base64 = await this._generateImage(styledPrompt, size);
      const buffer = Buffer.from(base64, 'base64');

      const filename = `${options.bookId}_${Date.now()}.png`;
      const filepath = join(this.outputDir, filename);
      writeFileSync(filepath, buffer);

      return {
        success: true,
        imageUrl: `/generated-images/${filename}`,
        prompt: options.prompt,
        style: options.style || 'pixar',
      };
    } catch (error: any) {
      return {
        success: false,
        prompt: options.prompt,
        style: options.style,
        error: error?.message || 'Image generation failed',
      };
    }
  }

  /**
   * Generate cover art for a book
   */
  async generateCoverArt(
    title: string,
    category: string,
    style?: string
  ): Promise<GeneratedImage> {
    const promptText = `Book cover illustration for "${title}", ${category} genre, ${style || 'digital_art'} style, eye-catching, colorful, high quality`;
    
    try {
      await this.initialize();

      const size = '1152x864';
      const base64 = await this._generateImage(promptText, size);
      const buffer = Buffer.from(base64, 'base64');

      const filename = `cover_${Date.now()}.png`;
      const filepath = join(this.outputDir, filename);
      writeFileSync(filepath, buffer);

      return {
        success: true,
        imageUrl: `/generated-images/${filename}`,
        prompt: promptText,
        style,
      };
    } catch (error: any) {
      return {
        success: false,
        prompt: promptText,
        style,
        error: error?.message || 'Cover art generation failed',
      };
    }
  }

  /**
   * Generate multiple images in batch
   */
  async generateBatch(
    optionsList: ImageGenerationOptions[],
    category: string
  ): Promise<GeneratedImage[]> {
    const results: GeneratedImage[] = [];

    for (const options of optionsList) {
      let result: GeneratedImage;

      if (category === 'COLORING_BOOK') {
        result = await this.generatePageImage(options, 'line_art');
      } else if (category === 'KIDS_STORY') {
        result = await this.generateKidsStoryImage(options);
      } else {
        result = await this.generatePageImage(options, 'digital_art');
      }

      results.push(result);

      // Add small delay between generations to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return results;
  }
}

// Singleton instance
let generatorInstance: BookImageGenerator | null = null;

export function getImageGenerator(): BookImageGenerator {
  if (!generatorInstance) {
    generatorInstance = new BookImageGenerator();
  }
  return generatorInstance;
}

/**
 * Generate image for a book page
 */
export async function generateBookImage(
  options: ImageGenerationOptions,
  category: string
): Promise<GeneratedImage> {
  const generator = getImageGenerator();

  

  if (category === 'COLORING_BOOK') {
    return generator.generatePageImage(options, 'line_art');
  } else if (category === 'KIDS_STORY') {
    return generator.generateKidsStoryImage(options);
  } else {
    return generator.generatePageImage(options, 'digital_art');
  }
}

/**
 * Generate cover art for a book
 */
export async function generateCoverArtFunction(
  title: string,
  category: string,
  style?: string
): Promise<GeneratedImage> {
  const generator = getImageGenerator();
  return generator.generateCoverArt(title, category, style);
}
