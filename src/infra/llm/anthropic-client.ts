import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import type { ZodType } from 'zod'
import { env } from '../env'
import { logger } from '../logger/logger'

export const LLM_MODEL = 'claude-haiku-4-5'
export const LLM_MAX_TOKENS = 128
export const LLM_TIMEOUT_MS = 5_000
// The SDK retries 408/409/429/5xx and connection errors with backoff, timeouts included,
// so the worst case is LLM_TIMEOUT_MS * (LLM_MAX_RETRIES + 1).
export const LLM_MAX_RETRIES = 1

export interface StructuredCompletionRequest<T> {
    operation: string
    system: string
    prompt: string
    schema: ZodType<T>
}

export interface LlmClient {
    /** Resolves to null when the model does not finish normally (refusal, max_tokens, empty parse). */
    completeStructured<T>(request: StructuredCompletionRequest<T>): Promise<T | null>
}

export type AnthropicMessagesApi = Pick<Anthropic['messages'], 'parse'>

export class AnthropicLlmClient implements LlmClient {

    constructor(private readonly messages: AnthropicMessagesApi) {}

    async completeStructured<T>({ operation, system, prompt, schema }: StructuredCompletionRequest<T>): Promise<T | null> {
        const startedAt = performance.now()

        try {
            const response = await this.messages.parse(
                {
                    model: LLM_MODEL,
                    max_tokens: LLM_MAX_TOKENS,
                    temperature: 0,
                    system,
                    messages: [{ role: 'user', content: prompt }],
                    output_config: { format: zodOutputFormat(schema) },
                },
                { timeout: LLM_TIMEOUT_MS, maxRetries: LLM_MAX_RETRIES },
            )

            logger.info({
                operation,
                model: LLM_MODEL,
                latencyMs: Math.round(performance.now() - startedAt),
                stopReason: response.stop_reason,
                inputTokens: response.usage.input_tokens,
                outputTokens: response.usage.output_tokens,
            }, 'Chamada ao LLM concluída')

            if (response.stop_reason !== 'end_turn') return null
            return (response.parsed_output as T | null) ?? null
        } catch (error) {
            logger.warn({
                operation,
                model: LLM_MODEL,
                latencyMs: Math.round(performance.now() - startedAt),
                errorName: error instanceof Error ? error.constructor.name : typeof error,
                status: error instanceof Anthropic.APIError ? error.status : undefined,
                errorMessage: error instanceof Error ? error.message : undefined,
            }, 'Falha na chamada ao LLM')
            throw error
        }
    }
}

let _client: LlmClient | null | undefined

export function getLlmClient(): LlmClient | null {
    if (_client === undefined) {
        _client = env.ANTHROPIC_API_KEY
            ? new AnthropicLlmClient(new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }).messages)
            : null
    }
    return _client
}
