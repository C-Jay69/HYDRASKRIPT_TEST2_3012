import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getLLMService } from '@/lib/llm-fallback-service';

/**
 * POST /api/manuscripts/[id]/process
 * Start processing a manuscript
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const manuscriptId = params.id;
    const body = await request.json();
    const { systemPrompt, userPrompt } = body;

    // Check if manuscript exists
    const manuscript = await db.manuscript.findUnique({
      where: { id: manuscriptId },
      include: { chunks: true },
    });

    if (!manuscript) {
      return NextResponse.json(
        { error: 'Manuscript not found' },
        { status: 404 }
      );
    }

    // Check if already processing
    if (manuscript.status === 'processing') {
      return NextResponse.json(
        { error: 'Manuscript is already being processed' },
        { status: 400 }
      );
    }

    // Create processing job
    const job = await db.processingJob.create({
      data: {
        manuscriptId: manuscript.id,
        status: 'in_progress',
        totalChunks: manuscript.chunks.length,
        completedChunks: 0,
        failedChunks: 0,
        systemPrompt: systemPrompt || undefined,
      },
    });

    // Update manuscript status
    await db.manuscript.update({
      where: { id: manuscript.id },
      data: { status: 'processing' },
    });

    // Start processing in background (non-blocking)
    processManuscriptBackground(manuscript.id, job.id, systemPrompt, userPrompt);

    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: 'Processing started',
      totalChunks: manuscript.chunks.length,
    });
  } catch (error: any) {
    console.error('Process error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to start processing' },
      { status: 500 }
    );
  }
}

/**
 * Background processing function
 * Processes chunks with fallback logic
 */
async function processManuscriptBackground(
  manuscriptId: string,
  jobId: string,
  systemPrompt?: string,
  userPrompt?: string
) {
  try {
    console.log(`[Job ${jobId}] Starting background processing`);

    const llmService = getLLMService();
    let completed = 0;
    let failed = 0;

    // Get all chunks
    const chunks = await db.chunk.findMany({
      where: { manuscriptId },
      orderBy: { chunkIndex: 'asc' },
    });

    for (const chunk of chunks) {
      try {
        console.log(`[Job ${jobId}] Processing chunk ${chunk.chunkIndex}/${chunks.length}`);

        // Update chunk status to processing
        await db.chunk.update({
          where: { id: chunk.id },
          data: { status: 'processing' },
        });

        // Process with LLM fallback service
        const result = await llmService.processChunk({
          chunkId: chunk.id,
          content: chunk.content,
          systemPrompt,
          userPrompt,
          jobId,
        });

        // Log provider attempts
        for (const attempt of result.providerAttempts) {
          await db.providerAttempt.create({
            data: {
              jobId,
              chunkId: chunk.id,
              providerName: attempt.provider,
              status: attempt.success ? 'success' : 'failed',
              errorMessage: attempt.errorMessage,
              retryCount: attempt.attempt,
              responseTime: attempt.responseTime,
            },
          });
        }

        if (result.success && result.response) {
          // Update chunk with success
          await db.chunk.update({
            where: { id: chunk.id },
            data: {
              status: 'completed',
              response: result.response,
              lastUsedProvider: result.providerUsed,
              errorMessage: null,
              retryCount: result.attempts,
            },
          });
          completed++;
        } else {
          // Update chunk with failure
          await db.chunk.update({
            where: { id: chunk.id },
            data: {
              status: 'failed',
              errorMessage: result.errorMessage,
              retryCount: result.attempts,
            },
          });
          failed++;
        }

        // Update job progress
        await db.processingJob.update({
          where: { id: jobId },
          data: {
            completedChunks: completed,
            failedChunks: failed,
            updatedAt: new Date(),
          },
        });

        console.log(
          `[Job ${jobId}] Chunk ${chunk.chunkIndex} completed. Progress: ${completed}/${chunks.length}`
        );
      } catch (error: any) {
        console.error(`[Job ${jobId}] Error processing chunk ${chunk.chunkIndex}:`, error);

        await db.chunk.update({
          where: { id: chunk.id },
          data: {
            status: 'failed',
            errorMessage: error?.message || 'Unknown error',
          },
        });

        failed++;

        await db.processingJob.update({
          where: { id: jobId },
          data: {
            completedChunks: completed,
            failedChunks: failed,
          },
        });
      }
    }

    // Update job and manuscript status
    const finalStatus = failed === 0 ? 'completed' : 'partial';
    await db.processingJob.update({
      where: { id: jobId },
      data: {
        status: finalStatus,
        errorMessage: failed > 0 ? `${failed} chunks failed to process` : null,
      },
    });

    await db.manuscript.update({
      where: { id: manuscriptId },
      data: { status: failed === 0 ? 'completed' : 'partial' },
    });

    console.log(
      `[Job ${jobId}] Processing complete. Completed: ${completed}, Failed: ${failed}`
    );
  } catch (error: any) {
    console.error(`[Job ${jobId}] Fatal error in background processing:`, error);

    // Update with failure status
    await db.processingJob.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        errorMessage: error?.message || 'Fatal processing error',
      },
    });

    await db.manuscript.update({
      where: { id: manuscriptId },
      data: { status: 'failed' },
    });
  }
}
