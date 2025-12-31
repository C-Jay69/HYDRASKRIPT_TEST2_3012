import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromAuthHeader } from '@/lib/auth';
import { getLLMService } from '@/lib/llm-fallback-service';
import { generateBookImage } from '@/lib/book-image-generator';

/**
 * POST /api/books/[id]/generate
 * Generate content and images for a book
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userPayload = getUserFromAuthHeader(request.headers.get('authorization'));

    if (!userPayload) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const book = await db.book.findUnique({
      where: { id: params.id },
      include: { pages: true },
    });

    if (!book) {
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      );
    }

    if (book.userId !== userPayload.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    if (book.status !== 'draft') {
      return NextResponse.json(
        { error: 'Book can only be generated from draft status' },
        { status: 400 }
      );
    }

    // Update book status to generating
    await db.book.update({
      where: { id: params.id },
      data: { status: 'generating' },
    });

    // Start background generation
    generateBookContent(params.id, book);

    return NextResponse.json({
      success: true,
      message: 'Book generation started',
      bookId: params.id,
    });
  } catch (error: any) {
    console.error('Generate book error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to start book generation' },
      { status: 500 }
    );
  }
}

/**
 * Background function to generate book content
 */
async function generateBookContent(bookId: string, book: any) {
  const llmService = getLLMService();

  try {
    console.log(`[Book ${bookId}] Starting generation`);

    // Generate content for each page
    for (const page of book.pages) {
      console.log(`[Book ${bookId}] generating page ${page.pageNumber}`);

      await db.page.update({
        where: { id: page.id },
        data: { status: 'generating' },
      });

      try {
        // Generate text content for non-blank pages
        if (page.pageType === 'text') {
          const prompt = buildPagePrompt(book, page);
          const result = await llmService.processChunk({
            chunkId: page.id,
            content: prompt,
            systemPrompt: book.systemPrompt,
            userPrompt: book.userPrompt,
            jobId: bookId,
          });

          if (result.success && result.response) {
            await db.page.update({
              where: { id: page.id },
              data: {
                content: result.response,
                status: 'completed',
                updatedAt: new Date(),
              },
            });
          } else {
            await db.page.update({
              where: { id: page.id },
              data: {
                status: 'failed',
                updatedAt: new Date(),
              },
            });
          }
        }

        // Generate images for kids stories and coloring books
        if (page.pageType === 'image' || page.pageType === 'coloring') {
          const imagePrompt = buildImagePrompt(book, page);
          const imageResult = await generateBookImage(
            {
              prompt: imagePrompt,
              style: book.imageStyle,
              bookId,
              pageId: page.id,
            },
            book.category
          );

          if (imageResult.success) {
            await db.page.update({
              where: { id: page.id },
              data: {
                imageUrl: imageResult.imageUrl,
                lineArtUrl: imageResult.imageUrl,
                status: 'completed',
                updatedAt: new Date(),
              },
            });

            // Log generated image
            await db.generatedImage.create({
              data: {
                bookId,
                pageId: page.id,
                imageUrl: imageResult.imageUrl!,
                prompt: imagePrompt,
                imageStyle: book.imageStyle,
                status: 'completed',
              },
            });
          } else {
            await db.page.update({
              where: { id: page.id },
              data: {
                status: 'failed',
                updatedAt: new Date(),
              },
            });
          }
        }

        // Blank pages are automatically completed
        if (page.pageType === 'blank') {
          await db.page.update({
            where: { id: page.id },
            data: {
              status: 'completed',
              updatedAt: new Date(),
            },
          });
        }

        console.log(`[Book ${bookId}] Completed page ${page.pageNumber}`);
      } catch (error: any) {
        console.error(
          `[Book ${bookId}] Error generating page ${page.pageNumber}:`,
          error
        );
        await db.page.update({
          where: { id: page.id },
          data: {
            status: 'failed',
            updatedAt: new Date(),
          },
        });
      }
    }

    // Generate cover art if needed
    if (book.hasCover) {
      const coverPrompt = `Create a book cover for "${book.title}". Style: ${book.imageStyle}`;
      const coverResult = await generateBookImage(
        {
          prompt: coverPrompt,
          style: book.imageStyle,
          bookId,
          pageId: 'cover',
        },
        book.category
      );

      if (coverResult.success) {
        await db.book.update({
          where: { id: bookId },
          data: { coverImage: coverResult.imageUrl },
        });
      }
    }

    // Update final status
    const completedPages = await db.page.count({
      where: { bookId, status: 'completed' },
    });
    const totalPages = book.pages.length;

    await db.book.update({
      where: { id: bookId },
      data: {
        status: completedPages === totalPages ? 'completed' : 'partial',
        updatedAt: new Date(),
      },
    });

    console.log(
      `[Book ${bookId}] Generation complete. ${completedPages}/${totalPages} pages generated`
    );
  } catch (error: any) {
    console.error(`[Book ${bookId}] Fatal error:`, error);

    await db.book.update({
      where: { id: bookId },
      data: {
        status: 'failed',
        updatedAt: new Date(),
      },
    });
  }
}

/**
 * Build prompt for text content generation
 */
function buildPagePrompt(book: any, page: any): string {
  const pagePrompts: Record<string, string> = {
    EBOOK: `Write page ${page.pageNumber} for an e-book titled "${book.title}". Make it engaging and informative.`,
    NOVEL: `Write page ${page.pageNumber} for a novel titled "${book.title}". ${book.styleAdaptation ? 'Use a literary, sophisticated style.' : ''} Create engaging narrative with good pacing.`,
    KIDS_STORY: `Write page ${page.pageNumber} for a children's story book titled "${book.title}". Use simple language, short sentences, and make it fun for kids. The next page will have an illustration.`,
  };

  return pagePrompts[book.category] || `Write page ${page.pageNumber} for a book titled "${book.title}".`;
}

/**
 * Build prompt for image generation
 */
function buildImagePrompt(book: any, page: any): string {
  const imagePrompts: Record<string, string> = {
    KIDS_STORY: `Illustration for page ${page.pageNumber} of children's book "${book.title}". Whimsical, colorful, child-friendly scene.`,
    COLORING_BOOK: `Black and white line art for page ${page.pageNumber} of coloring book. Theme: ${book.coloringTheme || 'General'}. Simple, clean outlines suitable for coloring.`,
  };

  return imagePrompts[book.category] || `Illustration for page ${page.pageNumber} of book "${book.title}"`;
}
