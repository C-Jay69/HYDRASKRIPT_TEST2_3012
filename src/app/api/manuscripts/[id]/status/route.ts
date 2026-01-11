import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/manuscripts/[id]/status
 * Get processing status for a manuscript
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const manuscriptId = params.id;

    // Get manuscript with chunks
    const manuscript = await db.manuscript.findUnique({
      where: { id: manuscriptId },
      include: {
        chunks: {
          orderBy: { chunkIndex: 'asc' },
          select: {
            id: true,
            chunkIndex: true,
            status: true,
            lastUsedProvider: true,
            retryCount: true,
            errorMessage: true,
          },
        },
        jobs: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            attempts: {
              orderBy: { createdAt: 'desc' },
              take: 50,
            },
          },
        },
      },
    });

    if (!manuscript) {
      return NextResponse.json(
        { error: 'Manuscript not found' },
        { status: 404 }
      );
    }

    const latestJob = manuscript.jobs[0];

    // Calculate statistics
    const chunksByStatus = {
      pending: manuscript.chunks.filter(c => c.status === 'pending').length,
      processing: manuscript.chunks.filter(c => c.status === 'processing').length,
      completed: manuscript.chunks.filter(c => c.status === 'completed').length,
      failed: manuscript.chunks.filter(c => c.status === 'failed').length,
    };

    // Provider statistics
    const providerStats = {
      main: { success: 0, failed: 0 },
      backup1: { success: 0, failed: 0 },
      backup2: { success: 0, failed: 0 },
    };

    if (latestJob) {
      for (const attempt of latestJob.attempts) {
        if (attempt.status === 'success') {
          providerStats[attempt.providerName as keyof typeof providerStats].success++;
        } else {
          providerStats[attempt.providerName as keyof typeof providerStats].failed++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      manuscript: {
        id: manuscript.id,
        filename: manuscript.filename,
        status: manuscript.status,
        wordCount: manuscript.wordCount,
        createdAt: manuscript.createdAt,
        updatedAt: manuscript.updatedAt,
      },
      job: latestJob ? {
        id: latestJob.id,
        status: latestJob.status,
        totalChunks: latestJob.totalChunks,
        completedChunks: latestJob.completedChunks,
        failedChunks: latestJob.failedChunks,
        systemPrompt: latestJob.systemPrompt,
        createdAt: latestJob.createdAt,
        updatedAt: latestJob.updatedAt,
      } : null,
      chunks: manuscript.chunks,
      statistics: {
        totalChunks: manuscript.chunks.length,
        chunksByStatus,
        progress: manuscript.chunks.length > 0
          ? (chunksByStatus.completed / manuscript.chunks.length) * 100
          : 0,
        providerStats,
        totalAttempts: latestJob?.attempts.length || 0,
      },
    });
  } catch (error: any) {
    console.error('Status error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to get status' },
      { status: 500 }
    );
  }
}
