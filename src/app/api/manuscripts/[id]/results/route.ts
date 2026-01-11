import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/manuscripts/[id]/results
 * Get processed results for a manuscript
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const manuscriptId = params.id;

    // Check if manuscript exists
    const manuscript = await db.manuscript.findUnique({
      where: { id: manuscriptId },
    });

    if (!manuscript) {
      return NextResponse.json(
        { error: 'Manuscript not found' },
        { status: 404 }
      );
    }

    // Get completed chunks with responses
    const chunks = await db.chunk.findMany({
      where: {
        manuscriptId,
        status: 'completed',
      },
      orderBy: { chunkIndex: 'asc' },
      select: {
        chunkIndex: true,
        response: true,
        lastUsedProvider: true,
      },
    });

    // Combine responses
    const combinedResults = chunks
      .map(chunk => chunk.response)
      .filter((response): response is string => response !== null && response !== undefined)
      .join('\n\n---\n\n');

    return NextResponse.json({
      success: true,
      manuscript: {
        id: manuscript.id,
        filename: manuscript.filename,
        status: manuscript.status,
      },
      results: {
        totalChunks: chunks.length,
        combinedResults,
        chunks: chunks,
      },
    });
  } catch (error: any) {
    console.error('Results error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to get results' },
      { status: 500 }
    );
  }
}
