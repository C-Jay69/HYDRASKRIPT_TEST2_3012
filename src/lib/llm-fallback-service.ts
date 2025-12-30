/**
 * LLM Fallback Service
 * Handles LLM processing with main + 2 backup providers
 * Implements retry logic with exponential backoff
 */

import ZAI, { ChatMessage } from 'z-ai-web-dev-sdk';

export type ProviderName = 'main' | 'backup1' | 'backup2';
export type ProcessingStatus = 'success' | 'failed';

export interface LLMConfig {
  maxRetries?: number;
  retryDelay?: number;        // Base delay in ms
  maxRetryDelay?: number;     // Max delay in ms
  enableExponentialBackoff?: boolean;
}

export interface ProcessChunkParams {
  chunkId: string;
  content: string;
  systemPrompt?: string;
  userPrompt?: string;
  jobId: string;
}

export interface ProcessResult {
  success: boolean;
  response?: string;
  providerUsed?: ProviderName;
  attempts: number;
  errorMessage?: string;
  totalResponseTime: number;
  providerAttempts: ProviderAttemptRecord[];
}

export interface ProviderAttemptRecord {
  provider: ProviderName;
  attempt: number;
  success: boolean;
  errorMessage?: string;
  responseTime: number;
}

const DEFAULT_CONFIG: Required<LLMConfig> = {
  maxRetries: 3,
  retryDelay: 1000,
  maxRetryDelay: 10000,
  enableExponentialBackoff: true,
};

export class LLMFallbackService {
  private config: Required<LLMConfig>;
  private zai: ZAI | null = null;

  constructor(config: LLMConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config } as Required<LLMConfig>;
  }

  /**
   * Initialize the ZAI SDK instance
   */
  private async initialize(): Promise<void> {
    if (!this.zai) {
      this.zai = await ZAI.create();
    }
  }

  /**
   * Calculate delay with exponential backoff
   */
  private calculateDelay(attempt: number): number {
    if (!this.config.enableExponentialBackoff) {
      return this.config.retryDelay;
    }

    const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
    return Math.min(delay, this.config.maxRetryDelay);
  }

  /**
   * Sleep for specified milliseconds
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create chat messages for processing
   */
  private createMessages(
    content: string,
    systemPrompt?: string,
    userPrompt?: string
  ): ChatMessage[] {
    const messages: ChatMessage[] = [];

    if (systemPrompt) {
      messages.push({
        role: 'assistant',
        content: systemPrompt,
      });
    }

    const finalPrompt = userPrompt ? `${userPrompt}\n\n${content}` : content;
    messages.push({
      role: 'user',
      content: finalPrompt,
    });

    return messages;
  }

  /**
   * Attempt to process a chunk with a specific provider
   */
  private async attemptWithProvider(
    provider: ProviderName,
    messages: ChatMessage[],
    attempt: number
  ): Promise<{ success: boolean; response?: string; responseTime: number; error?: string }> {
    const startTime = Date.now();

    try {
      await this.initialize();

      // In a real implementation, you might have different API keys or endpoints
      // For now, we use the same SDK but can add provider-specific logic here
      const response = await this.zai!.chat.completions.create({
        messages,
        stream: false,
        thinking: { type: 'disabled' },
      });

      const result = response.choices?.[0]?.message?.content;

      if (!result || result.trim().length === 0) {
        throw new Error('Empty response from AI');
      }

      const responseTime = Date.now() - startTime;

      return {
        success: true,
        response: result,
        responseTime,
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      return {
        success: false,
        responseTime,
        error: error?.message || error?.toString() || 'Unknown error',
      };
    }
  }

  /**
   * Process a chunk with fallback logic
   */
  public async processChunk(params: ProcessChunkParams): Promise<ProcessResult> {
    const { content, systemPrompt, userPrompt, jobId } = params;
    const messages = this.createMessages(content, systemPrompt, userPrompt);

    const providers: ProviderName[] = ['main', 'backup1', 'backup2'];
    const providerAttempts: ProviderAttemptRecord[] = [];
    let totalResponseTime = 0;
    let lastError = '';

    // Try each provider with retries
    for (const provider of providers) {
      for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
        const { success, response, responseTime, error } =
          await this.attemptWithProvider(provider, messages, attempt);

        totalResponseTime += responseTime;

        providerAttempts.push({
          provider,
          attempt,
          success,
          responseTime,
          errorMessage: error,
        });

        if (success && response) {
          return {
            success: true,
            response,
            providerUsed: provider,
            attempts: providerAttempts.length,
            totalResponseTime,
            providerAttempts,
          };
        }

        // Log the failure
        console.error(
          `[${provider}] Attempt ${attempt} failed:`,
          error
        );
        lastError = error || 'Unknown error';

        // If not last attempt, wait before retry
        if (attempt < this.config.maxRetries) {
          const delay = this.calculateDelay(attempt);
          await this.sleep(delay);
        }
      }

      // If this provider failed completely, log and move to next
      console.error(
        `[${provider}] All ${this.config.maxRetries} attempts failed. Moving to next provider.`
      );
    }

    // All providers failed
    return {
      success: false,
      attempts: providerAttempts.length,
      errorMessage: `All providers failed. Last error: ${lastError}`,
      totalResponseTime,
      providerAttempts,
    };
  }

  /**
   * Process multiple chunks in parallel (with concurrency limit)
   */
  public async processChunksParallel(
    chunks: Array<{ id: string; content: string }>,
    systemPrompt?: string,
    userPrompt?: string,
    concurrencyLimit: number = 3
  ): Promise<Array<{ chunkId: string; result: ProcessResult }>> {
    const results: Array<{ chunkId: string; result: ProcessResult }> = [];
    const chunksToProcess = [...chunks];

    // Process in batches
    while (chunksToProcess.length > 0) {
      const batch = chunksToProcess.splice(0, concurrencyLimit);
      const batchResults = await Promise.all(
        batch.map(chunk =>
          this.processChunk({
            chunkId: chunk.id,
            content: chunk.content,
            systemPrompt,
            userPrompt,
            jobId: 'batch_' + Date.now(),
          }).then(result => ({
            chunkId: chunk.id,
            result,
          }))
        )
      );

      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Get statistics from provider attempts
   */
  public getAttemptStats(attempts: ProviderAttemptRecord[]): {
    totalAttempts: number;
    successfulAttempts: number;
    failedAttempts: number;
    providerSuccess: Record<ProviderName, number>;
    providerFailure: Record<ProviderName, number>;
    averageResponseTime: number;
    successRate: number;
  } {
    const stats = {
      totalAttempts: attempts.length,
      successfulAttempts: 0,
      failedAttempts: 0,
      providerSuccess: { main: 0, backup1: 0, backup2: 0 } as Record<ProviderName, number>,
      providerFailure: { main: 0, backup1: 0, backup2: 0 } as Record<ProviderName, number>,
      totalResponseTime: 0,
      averageResponseTime: 0,
      successRate: 0,
    };

    for (const attempt of attempts) {
      if (attempt.success) {
        stats.successfulAttempts++;
        stats.providerSuccess[attempt.provider]++;
      } else {
        stats.failedAttempts++;
        stats.providerFailure[attempt.provider]++;
      }
      stats.totalResponseTime += attempt.responseTime;
    }

    if (attempts.length > 0) {
      stats.averageResponseTime = stats.totalResponseTime / attempts.length;
      stats.successRate = (stats.successfulAttempts / stats.totalAttempts) * 100;
    }

    return stats;
  }

  /**
   * Get provider health status
   */
  public getProviderHealth(attempts: ProviderAttemptRecord[]): Record<
    ProviderName,
    { available: boolean; successRate: number; lastUsed?: string }
  > {
    const health: any = {};

    for (const provider of ['main', 'backup1', 'backup2'] as ProviderName[]) {
      const providerAttempts = attempts.filter(a => a.provider === provider);

      if (providerAttempts.length === 0) {
        health[provider] = { available: true, successRate: 100 };
        continue;
      }

      const successful = providerAttempts.filter(a => a.success).length;
      const successRate = (successful / providerAttempts.length) * 100;

      health[provider] = {
        available: successRate > 0,
        successRate: successRate,
        lastUsed: new Date().toISOString(),
      };
    }

    return health;
  }
}

/**
 * Singleton instance for easy access
 */
let llmServiceInstance: LLMFallbackService | null = null;

export function getLLMService(config?: LLMConfig): LLMFallbackService {
  if (!llmServiceInstance) {
    llmServiceInstance = new LLMFallbackService(config);
  }
  return llmServiceInstance;
}

/**
 * Utility function to process a single chunk
 */
export async function processChunkWithFallback(
  content: string,
  systemPrompt?: string,
  userPrompt?: string
): Promise<ProcessResult> {
  const service = getLLMService();
  return service.processChunk({
    chunkId: 'temp_' + Date.now(),
    content,
    systemPrompt,
    userPrompt,
    jobId: 'temp_' + Date.now(),
  });
}
