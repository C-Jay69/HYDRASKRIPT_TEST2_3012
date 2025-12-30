/**
 * Book Category Types and Constraints
 */

export type BookCategory = 'EBOOK' | 'NOVEL' | 'KIDS_STORY' | 'COLORING_BOOK' | 'BLANK_NOTEBOOK';
export type BookStatus = 'draft' | 'generating' | 'completed' | 'published' | 'failed';

export interface BookCategoryConfig {
  id: BookCategory;
  name: string;
  description: string;
  pageSize: string;
  minPages: number;
  maxPages: number;
  requiresImages: boolean;
  features: string[];
}

export const BOOK_CATEGORIES: Record<BookCategory, BookCategoryConfig> = {
  EBOOK: {
    id: 'EBOOK',
    name: 'E-book',
    description: 'Standard formatting, suitable for digital download',
    pageSize: '6x9',
    minPages: 75,
    maxPages: 150,
    requiresImages: false,
    features: ['standard formatting', 'digital download ready'],
  },
  NOVEL: {
    id: 'NOVEL',
    name: 'Novel',
    description: 'Structured narrative flow with chapter formatting',
    pageSize: '6x9',
    minPages: 100,
    maxPages: 250,
    requiresImages: false,
    features: ['structured narrative', 'chapter formatting', 'optional AI style adaptation'],
  },
  KIDS_STORY: {
    id: 'KIDS_STORY',
    name: 'Kids Story Book',
    description: 'High-quality imagery in Disney/Pixar/DreamWorks visual style',
    pageSize: '8x10',
    minPages: 1,
    maxPages: 25,
    requiresImages: true,
    features: ['whimsical illustrations', 'child-friendly art', 'visual storytelling'],
  },
  COLORING_BOOK: {
    id: 'COLORING_BOOK',
    name: 'Coloring Book',
    description: 'Black and white downloadable illustrations for coloring',
    pageSize: '8x10',
    minPages: 20,
    maxPages: 20,
    requiresImages: true,
    features: ['black & white line art', 'high-resolution', 'downloadable'],
  },
  BLANK_NOTEBOOK: {
    id: 'BLANK_NOTEBOOK',
    name: 'Customizable Blank Notebook',
    description: 'Personalized blank notebook with cover options',
    pageSize: '8x10',
    minPages: 20,
    maxPages: 20,
    requiresImages: true,
    features: ['customizable', 'blank pages', 'cover art options'],
  },
};

export const COLORING_THEMES = [
  'Mandalas',
  'Wildlife',
  'Famous places and landmarks',
  'Famous works of art',
  'Underwater scenes',
] as const;

export const IMAGE_STYLES = [
  { id: 'disney', name: 'Disney Style', description: 'Classic Disney animation aesthetic' },
  { id: 'pixar', name: 'Pixar Style', description: 'Modern Pixar 3D animation style' },
  { id: 'dreamworks', name: 'DreamWorks Style', description: 'DreamWorks animation aesthetic' },
  { id: 'line_art', name: 'Line Art', description: 'Black and white line drawings' },
  { id: 'watercolor', name: 'Watercolor', description: 'Soft watercolor painting style' },
  { id: 'digital_art', name: 'Digital Art', description: 'Modern digital illustration' },
] as const;

export function getCategoryConfig(category: BookCategory): BookCategoryConfig | null {
  return BOOK_CATEGORIES[category] || null;
}

export function validatePageCount(category: BookCategory, pageCount: number): boolean {
  const config = getCategoryConfig(category);
  if (!config) return false;
  return pageCount >= config.minPages && pageCount <= config.maxPages;
}

export function getPageCountRange(category: BookCategory): string {
  const config = getCategoryConfig(category);
  if (!config) return 'N/A';
  if (config.minPages === config.maxPages) {
    return `${config.minPages} pages`;
  }
  return `${config.minPages}-${config.maxPages} pages`;
}
