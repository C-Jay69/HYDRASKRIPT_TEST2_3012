import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromAuthHeader, isAdmin } from '@/lib/auth';
import { BOOK_CATEGORIES } from '@/lib/book-types';

/**
 * GET /api/books/[id]
 * Get book details
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
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
      include: {
        pages: {
          orderBy: { pageNumber: 'asc' },
        },
        images: {
          orderBy: { createdAt: 'desc' },
        },
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!book) {
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      );
    }

    // Check ownership
    if (book.userId !== userPayload.id && !isAdmin(userPayload)) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      book: {
        ...book,
        categoryConfig: BOOK_CATEGORIES[book.category],
      },
    });
  } catch (error: any) {
    console.error('Get book error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to get book' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/books/[id]
 * Delete a book
 */
export async function DELETE(
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
    });

    if (!book) {
      return NextResponse.json(
        { error: 'Book not found' },
        { status: 404 }
      );
    }

    // Check ownership
    if (book.userId !== userPayload.id && !isAdmin(userPayload)) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    await db.book.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Book deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete book error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to delete book' },
      { status: 500 }
    );
  }
}
