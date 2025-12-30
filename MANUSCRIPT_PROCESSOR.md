# Manuscript Processing System

A robust Next.js application for processing large manuscripts with AI-powered analysis and automatic fallback to backup providers.

## Features

### Core Capabilities
- **Automatic Chunking**: Large manuscripts are automatically split into processable chunks
- **Smart Fallback System**: 3-tier provider architecture (main + 2 backups)
- **Automatic Retry**: Configurable retry logic with exponential backoff
- **Real-time Progress**: Live status updates and progress tracking
- **Provider Monitoring**: Track which provider handled each chunk
- **Error Recovery**: Graceful handling of provider failures

### Architecture
- **Frontend**: Next.js 15 with App Router, React 19, shadcn/ui
- **Backend**: Next.js API routes with Prisma ORM
- **Database**: SQLite for local development
- **AI SDK**: z-ai-web-dev-sdk with automatic fallback

## How It Works

### 1. Upload
- Upload text files (.txt) via the web interface
- System automatically chunks the manuscript
- Chunks are created with overlap for context preservation

### 2. Configure (Optional)
- Set a system prompt to define AI behavior
- Set a user prompt for specific instructions
- Default: Direct processing without prompts

### 3. Process
- Click "Start Processing" to begin
- Each chunk is processed with fallback logic:
  1. Try main provider (up to 3 retries)
  2. If fails, try backup1 (up to 3 retries)
  3. If fails, try backup2 (up to 3 retries)
- All attempts are logged for analysis

### 4. Monitor
- Real-time progress updates
- View chunk-by-chunk status
- See which provider succeeded
- Track retry attempts and response times

### 5. Download
- Download combined results
- View processing statistics
- Check provider performance

## API Endpoints

### Upload Manuscript
```bash
POST /api/manuscripts/upload
Content-Type: multipart/form-data

file: <file>
```

### Start Processing
```bash
POST /api/manuscripts/[id]/process
Content-Type: application/json

{
  "systemPrompt": "You are an expert editor...",
  "userPrompt": "Please analyze..."
}
```

### Get Status
```bash
GET /api/manuscripts/[id]/status
```

### Get Results
```bash
GET /api/manuscripts/[id]/results
```

### List Manuscripts
```bash
GET /api/manuscripts?status=completed&limit=20&offset=0
```

## Configuration

### Chunking (src/lib/manuscript-chunker.ts)
```typescript
const chunker = new ManuscriptChunker({
  maxChunkSize: 15000,    // Max characters per chunk
  overlapSize: 500,       // Overlap between chunks
  preserveParagraphs: true, // Keep paragraphs together
});
```

### Fallback Service (src/lib/llm-fallback-service.ts)
```typescript
const llmService = new LLMFallbackService({
  maxRetries: 3,              // Retries per provider
  retryDelay: 1000,           // Base delay (ms)
  maxRetryDelay: 10000,        // Max delay (ms)
  enableExponentialBackoff: true, // Exponential backoff
});
```

## Provider Logic

The system uses a 3-tier provider system:

1. **Main Provider**: First choice for all chunks
2. **Backup 1**: Used if main provider fails all retries
3. **Backup 2**: Used if backup1 fails all retries

Each provider gets up to `maxRetries` attempts before moving to the next.

Retry delays follow exponential backoff:
- Attempt 1: No delay
- Attempt 2: 1s delay
- Attempt 3: 2s delay
- Attempt 4: 4s delay
- Max delay: 10s

## Database Schema

### Manuscript
- File metadata (name, size, word count)
- Status tracking
- Relationships to chunks and jobs

### Chunk
- Content and index
- Processing status
- Response and error messages
- Last used provider

### ProcessingJob
- Job status and progress
- System prompt configuration
- Relationships to attempts

### ProviderAttempt
- Provider used (main/backup1/backup2)
- Success/failure status
- Retry count and response time
- Error messages

## Usage Example

### Basic Flow
1. Navigate to http://localhost:3000
2. Click "Upload" area or drag-and-drop a .txt file
3. (Optional) Configure system and user prompts
4. Click "Start Processing"
5. Monitor progress in real-time
6. Download results when complete

### With Custom Prompts
```typescript
// System prompt: Define the AI's role
"You are an expert academic editor. Analyze the manuscript for:
- Grammar and syntax errors
- Clarity and coherence
- Logical flow
- Academic tone"

// User prompt: Specific instructions
"Please review the following text and provide detailed feedback"
```

## Monitoring

### Status Tracking
The system tracks:
- Pending chunks (not yet processed)
- Processing chunks (currently being processed)
- Completed chunks (successfully processed)
- Failed chunks (all providers failed)

### Provider Statistics
View performance for each provider:
- Success count
- Failure count
- Average response time
- Last used timestamp

## Error Handling

### Chunk-Level Errors
- Automatic retry with next provider
- Error messages logged
- Chunk marked as "failed" only after all providers exhausted

### Job-Level Errors
- Partial completion supported
- Failed chunks can be re-processed
- Detailed error logging

## Development

### Run Development Server
```bash
bun run dev
```

### Run Linter
```bash
bun run lint
```

### Push Database Changes
```bash
bun run db:push
```

## File Structure

```
src/
├── app/
│   ├── api/
│   │   └── manuscripts/
│   │       ├── upload/route.ts
│   │       ├── [id]/
│   │       │   ├── process/route.ts
│   │       │   ├── status/route.ts
│   │       │   └── results/route.ts
│   │       └── route.ts
│   └── page.tsx
├── lib/
│   ├── db.ts
│   ├── manuscript-chunker.ts
│   └── llm-fallback-service.ts
```

## Future Enhancements

- WebSocket support for real-time updates
- PDF document support
- Custom provider configuration
- Batch processing
- Advanced retry strategies
- Processing templates
- Export to multiple formats (PDF, DOCX, etc.)

## Notes

- The system is designed for large manuscripts
- Automatic chunking ensures no size limits
- Fallback logic ensures reliability
- Progress updates keep users informed
- Detailed logging for debugging

## Troubleshooting

### Processing Stuck
- Check the dev.log for errors
- Verify database connection
- Check provider availability

### All Chunks Failed
- Review error messages in status
- Check provider configuration
- Verify API keys (if needed)

### Slow Processing
- Adjust chunk size in config
- Reduce retry count
- Check network latency

## License

MIT
