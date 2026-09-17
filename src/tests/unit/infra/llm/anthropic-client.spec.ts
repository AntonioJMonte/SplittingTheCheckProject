import { describe, it, expect, vi } from 'vitest'
import Anthropic from '@anthropic-ai/sdk'
import {
  AnthropicLlmClient,
  AnthropicMessagesApi,
  LLM_MAX_RETRIES,
  LLM_MAX_TOKENS,
  LLM_MODEL,
  LLM_TIMEOUT_MS,
  getLlmClient,
} from '../../../../infra/llm/anthropic-client'
import { categorizationOutputSchema } from '../../../../infra/llm/categorizer'

function makeMessagesApi(parse: (...args: unknown[]) => Promise<unknown>) {
  const parseMock = vi.fn(parse)
  return { api: { parse: parseMock } as unknown as AnthropicMessagesApi, parseMock }
}

function parsedMessage(overrides: Record<string, unknown> = {}) {
  return {
    stop_reason: 'end_turn',
    usage: { input_tokens: 180, output_tokens: 9 },
    parsed_output: { category: 'Lazer' },
    ...overrides,
  }
}

const request = {
  operation: 'categorize-expense',
  system: 'system prompt',
  prompt: '<despesa>...</despesa>',
  schema: categorizationOutputSchema,
}

describe('AnthropicLlmClient', () => {
  it('should call Haiku with structured output, short max_tokens, temperature 0 and per-request timeout/retries', async () => {
    const { api, parseMock } = makeMessagesApi(async () => parsedMessage())
    const sut = new AnthropicLlmClient(api)

    await sut.completeStructured(request)

    const [body, options] = parseMock.mock.calls[0] as [Record<string, any>, Record<string, unknown>]
    expect(body.model).toBe('claude-haiku-4-5')
    expect(body.model).toBe(LLM_MODEL)
    expect(body.max_tokens).toBe(LLM_MAX_TOKENS)
    expect(body.temperature).toBe(0)
    expect(body.system).toBe('system prompt')
    expect(body.messages).toEqual([{ role: 'user', content: '<despesa>...</despesa>' }])
    expect(body.output_config.format.type).toBe('json_schema')
    expect(options).toEqual({ timeout: LLM_TIMEOUT_MS, maxRetries: LLM_MAX_RETRIES })
  })

  it('should return the parsed output when the model finishes normally', async () => {
    const { api } = makeMessagesApi(async () => parsedMessage())

    await expect(new AnthropicLlmClient(api).completeStructured(request)).resolves.toEqual({ category: 'Lazer' })
  })

  it.each(['refusal', 'max_tokens'])('should return null when stop_reason is %s', async stopReason => {
    const { api } = makeMessagesApi(async () => parsedMessage({ stop_reason: stopReason }))

    await expect(new AnthropicLlmClient(api).completeStructured(request)).resolves.toBeNull()
  })

  it('should return null when the SDK could not produce a parsed output', async () => {
    const { api } = makeMessagesApi(async () => parsedMessage({ parsed_output: null }))

    await expect(new AnthropicLlmClient(api).completeStructured(request)).resolves.toBeNull()
  })

  it('should rethrow SDK errors (timeout, API status, broken JSON) for the caller to fall back', async () => {
    const timeout = new Anthropic.APIConnectionTimeoutError()
    const brokenJson = new Anthropic.AnthropicError('Failed to parse structured output as JSON: Unexpected token')

    await expect(new AnthropicLlmClient(makeMessagesApi(async () => { throw timeout }).api).completeStructured(request))
      .rejects.toBe(timeout)
    await expect(new AnthropicLlmClient(makeMessagesApi(async () => { throw brokenJson }).api).completeStructured(request))
      .rejects.toBe(brokenJson)
  })
})

describe('getLlmClient', () => {
  it('should not build a client when ANTHROPIC_API_KEY is absent (tests run without a key)', () => {
    expect(getLlmClient()).toBeNull()
  })
})
