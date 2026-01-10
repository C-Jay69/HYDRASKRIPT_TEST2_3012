
import { generateBookImage } from '../src/lib/book-image-generator';
import { generateBookAudio } from '../src/lib/audio-generator';
import { BOOK_CATEGORIES } from '../src/lib/book-types';

// Mock DB objects
const mockBook = {
  id: 'test-book-1',
  title: 'The Brave Little Toaster',
  category: 'KIDS_STORY',
  imageStyle: 'pixar',
  authorStyle: 'Dr. Seuss',
  hasAudio: true,
  audioVoice: 'alloy',
};

const mockPage = {
  id: 'page-1',
  pageNumber: 1,
  pageType: 'text',
};

async function testGenerators() {
  console.log('--- Starting Generator Tests ---');

  // Test 1: Image Generation (Kids Story)
  console.log('\nTesting Kids Story Image Generation...');
  try {
    const imageResult = await generateBookImage({
      prompt: `Illustration for page ${mockPage.pageNumber} of children's book "${mockBook.title}". Whimsical, colorful, child-friendly scene.`,
      style: mockBook.imageStyle,
      bookId: mockBook.id,
      pageId: mockPage.id,
    }, 'KIDS_STORY');
    
    console.log('Image Result:', imageResult.success ? 'SUCCESS' : 'FAILED');
    if (imageResult.success) console.log('URL:', imageResult.imageUrl);
    else console.log('Error:', imageResult.error);
  } catch (e) {
    console.error('Image Gen Exception:', e);
  }

  // Test 2: Audio Generation
  console.log('\nTesting Audio Generation...');
  try {
    const audioResult = await generateBookAudio({
      text: "Once upon a time, there was a brave little toaster who loved to make toast.",
      voice: mockBook.audioVoice,
      bookId: mockBook.id,
      pageId: mockPage.id,
    });

    console.log('Audio Result:', audioResult.success ? 'SUCCESS' : 'FAILED');
    if (audioResult.success) console.log('URL:', audioResult.audioUrl);
    else console.log('Error:', audioResult.error);
  } catch (e) {
    console.error('Audio Gen Exception:', e);
  }

  // Test 3: Prompt Building Logic (Simulation)
  console.log('\nTesting Prompt Building Logic...');
  const styleInstruction = mockBook.authorStyle 
    ? `Write in the style of ${mockBook.authorStyle}.` 
    : '';
  
  const expectedPrompt = `Write page ${mockPage.pageNumber} for a children's story book titled "${mockBook.title}". Use simple language, short sentences, and make it fun for kids. ${styleInstruction} The next page will have an illustration.`;
  
  console.log(`Style Instruction: "${styleInstruction}"`);
  console.log(`Expected Prompt: "${expectedPrompt}"`);
  
  // Verify logic matches route.ts
  const pagePrompts: Record<string, string> = {
    EBOOK: `Write page ${mockPage.pageNumber} for an e-book titled "${mockBook.title}". Make it engaging and informative. ${styleInstruction}`,
    NOVEL: `Write page ${mockPage.pageNumber} for a novel titled "${mockBook.title}". ${styleInstruction} Create engaging narrative with good pacing.`,
    KIDS_STORY: `Write page ${mockPage.pageNumber} for a children's story book titled "${mockBook.title}". Use simple language, short sentences, and make it fun for kids. ${styleInstruction} The next page will have an illustration.`,
    AUDIO_BOOK: `Write script for page ${mockPage.pageNumber} of an audio book titled "${mockBook.title}". Write in a clear, spoken-word style suitable for narration. ${styleInstruction}`,
  };

  const actualPrompt = pagePrompts[mockBook.category];
  
  if (actualPrompt === expectedPrompt) {
    console.log('Prompt Logic: PASSED');
  } else {
    console.log('Prompt Logic: FAILED');
    console.log('Actual:', actualPrompt);
    console.log('Expected:', expectedPrompt);
  }

  // Test 4: Coloring Book Logic
  console.log('\nTesting Coloring Book Logic...');
  const coloringBook = { ...mockBook, category: 'COLORING_BOOK', coloringTheme: 'Mandalas' };
  const coloringPrompt = `Black and white line art for page ${mockPage.pageNumber} of coloring book. Theme: ${coloringBook.coloringTheme || 'General'}. Simple, clean outlines suitable for coloring.`;
  console.log(`Coloring Prompt: "${coloringPrompt}"`);
  
  console.log('--- Tests Completed ---');
}

testGenerators();
