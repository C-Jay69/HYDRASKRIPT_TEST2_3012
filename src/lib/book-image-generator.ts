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
   * Generate an image for a coloring book page
   */
  async generateColoringPage(options: ImageGenerationOptions): Promise<GeneratedImage> {
    try {
      await this.initialize();

      const styledPrompt = this.buildStyledPrompt(options.prompt, options.style || 'line_art');
      const size = options.size || '1152x864'; // 8x10 ratio

      const response = await this.zai!.images.generations.create({
        prompt: styledPrompt,
        size: size as any,
      });

      const imageBase64 = response.data[0].base64;
      const buffer = Buffer.from(imageBase64, 'base64');

      const filename = `${options.bookId}_${Date.now()}.png`;
      const filepath = join(this.outputDir, filename);
      writeFileSync(filepath, buffer);

      return {
        success: true,
        imageUrl: `/generated-images/${filename}`,
        prompt: options.prompt,
        style: options.style || 'line_art',
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

      const response = await this.zai!.images.generations.create({
        prompt: styledPrompt,
        size: size as any,
      });

      const imageBase64 = response.data[0].base64;
      const buffer = Buffer.from(imageBase64, 'base64');

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

      const response = await this.zai!.images.generations.create({
        prompt: promptText,
        size: size as any,
      });

      const imageBase64 = response.data[0].base64;
      const buffer = Buffer.from(imageBase64, 'base64');

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
        result = await this.generateColoringPage(options);
      } else if (category === 'KIDS_STORY') {
        result = await this.generateKidsStoryImage(options);
      } else {
        result = await this.generateColoringPage(options);
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
    return generator.generateColoringPage(options);
  } else if (category === 'KIDS_STORY') {
    return generator.generateKidsStoryImage(options);
  } else {
    return generator.generateColoringPage(options);
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
