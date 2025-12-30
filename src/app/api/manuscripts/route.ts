import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/manuscripts
 * List all manuscripts
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause
    const where: any = {};
    if (status) {
      where.status = status;
    }

    // Get manuscripts
    const manuscripts = await db.manuscript.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        _count: {
          select: { chunks: true },
        },
      },
    });

    // Get total count
    const total = await db.manuscript.count({ where });

    return NextResponse.json({
      success: true,
      manuscripts: manuscripts.map(m => ({
        id: m.id,
        filename: m.filename,
        fileSize: m.fileSize,
        wordCount: m.wordCount,
        status: m.status,
        totalChunks: m._count.chunks,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error: any) {
    console.error('List error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to list manuscripts' },
      { status: 500 }
    );
  }
}
