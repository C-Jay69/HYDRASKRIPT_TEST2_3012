import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromAuthHeader, isAdmin } from '@/lib/auth';
import { BookCategory, BOOK_CATEGORIES, validatePageCount } from '@/lib/book-types';

interface CreateBookRequest {
  title: string;
  category: BookCategory;
  description?: string;
  pageCount: number;
  systemPrompt?: string;
  userPrompt?: string;
  styleAdaptation?: boolean;
  imageStyle?: string;
  coloringTheme?: string;
  authorStyle?: string;
  hasAudio?: boolean;
}

/**
 * POST /api/books
 * Create a new book project
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const userPayload = getUserFromAuthHeader(request.headers.get('authorization'));

    if (!userPayload) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body: CreateBookRequest = await request.json();

    // Validation
    if (!body.title || !body.category) {
      return NextResponse.json(
        { error: 'Title and category are required' },
        { status: 400 }
      );
    }

    // Validate category
    if (!BOOK_CATEGORIES[body.category]) {
      return NextResponse.json(
        { error: `Invalid category. Valid options: ${Object.keys(BOOK_CATEGORIES).join(', ')}` },
        { status: 400 }
      );
    }

    // Validate page count
    const categoryConfig = BOOK_CATEGORIES[body.category];
    if (!validatePageCount(body.category, body.pageCount)) {
      return NextResponse.json(
        {
          error: `Invalid page count for ${categoryConfig.name}. Must be ${categoryConfig.minPages}-${categoryConfig.maxPages} pages.`,
        },
        { status: 400 }
      );
    }

    // Check user's book limit based on membership
    const userBooksCount = await db.book.count({
      where: { userId: userPayload.id },
    });

    const bookLimits: Record<string, number> = {
      free: 1,
      basic: 5,
      premium: 999,
    };

    const maxBooks = bookLimits[userPayload.membershipType] || 1;

    if (userBooksCount >= maxBooks) {
      return NextResponse.json(
        {
          error: `Your ${userPayload.membershipType} plan allows a maximum of ${maxBooks} books.`,
        },
        { status: 403 }
      );
    }

    // Create book
    const book = await db.book.create({
      data: {
        userId: userPayload.id,
        title: body.title,
        category: body.category,
        description: body.description || null,
        status: 'draft',
        pageCount: body.pageCount,
        pageSize: categoryConfig.pageSize,
        systemPrompt: body.systemPrompt || null,
        userPrompt: body.userPrompt || null,
        styleAdaptation: body.styleAdaptation || false,
        imageStyle: body.imageStyle || null,
        coloringTheme: body.coloringTheme || null,
        authorStyle: body.authorStyle || null,
        hasAudio: body.hasAudio || false,
      },
    });

    // Create blank pages
    const pages = await Promise.all(
      Array.from({ length: body.pageCount }, async (_, i) => {
        let pageType = 'text';
        
        // Set page type based on category
        if (body.category === 'COLORING_BOOK') {
          pageType = 'coloring';
        } else if (body.category === 'BLANK_NOTEBOOK') {
          pageType = 'blank';
        } else if (body.category === 'KIDS_STORY') {
          // Kids stories have text on odd pages, images on even
          pageType = i % 2 === 0 ? 'image' : 'text';
        }

        return db.page.create({
          data: {
            bookId: book.id,
            pageNumber: i + 1,
            pageType,
            status: 'pending',
          },
        });
      })
    );

    return NextResponse.json({
      success: true,
      book: {
        ...book,
        pages,
        categoryConfig: {
          ...categoryConfig,
          pageCountRange: `${categoryConfig.minPages}-${categoryConfig.maxPages}`,
        },
      },
    });
  } catch (error: any) {
    console.error('Create book error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create book' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/books
 * List user's books
 */
export async function GET(request: NextRequest) {
  try {
    const userPayload = getUserFromAuthHeader(request.headers.get('authorization'));

    if (!userPayload) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status');

    const where: any = { userId: userPayload.id };
    if (category) where.category = category;
    if (status) where.status = status;

    const books = await db.book.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        pages: {
          orderBy: { pageNumber: 'asc' },
          take: 5, // Preview first 5 pages
        },
        _count: {
          select: { pages: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      books: books.map(book => ({
        ...book,
        categoryConfig: BOOK_CATEGORIES[book.category as BookCategory],
      })),
    });
  } catch (error: any) {
    console.error('List books error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to list books' },
      { status: 500 }
    );
  }
}
