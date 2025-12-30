import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chunkManuscript } from '@/lib/manuscript-chunker';

/**
 * POST /api/manuscripts/upload
 * Upload a manuscript file for processing
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['text/plain', 'text/markdown', 'application/pdf'];
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.txt')) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}. Please upload .txt or .md files.` },
        { status: 400 }
      );
    }

    // Read file content
    const text = await file.text();

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'File is empty' },
        { status: 400 }
      );
    }

    // Chunk the manuscript
    const chunks = chunkManuscript(text);

    // Create manuscript record
    const manuscript = await db.manuscript.create({
      data: {
        filename: file.name,
        fileSize: file.size,
        mimeType: file.type,
        status: 'pending',
        totalPages: null,
        wordCount: text.split(/\s+/).filter(w => w.length > 0).length,
      },
    });

    // Create chunk records
    await db.chunk.createMany({
      data: chunks.map(chunk => ({
        manuscriptId: manuscript.id,
        chunkIndex: chunk.index,
        content: chunk.content,
        status: 'pending',
      })),
    });

    // Fetch created chunks with their IDs
    const createdChunks = await db.chunk.findMany({
      where: { manuscriptId: manuscript.id },
      orderBy: { chunkIndex: 'asc' },
    });

    return NextResponse.json({
      success: true,
      manuscript: {
        id: manuscript.id,
        filename: manuscript.filename,
        fileSize: manuscript.fileSize,
        wordCount: manuscript.wordCount,
        status: manuscript.status,
        createdAt: manuscript.createdAt,
      },
      chunks: createdChunks.map(chunk => ({
        id: chunk.id,
        index: chunk.chunkIndex,
        wordCount: chunk.content.split(/\s+/).filter(w => w.length > 0).length,
        charCount: chunk.content.length,
        status: chunk.status,
      })),
      totalChunks: chunks.length,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to upload manuscript' },
      { status: 500 }
    );
  }
}
