import { describe, it, expect } from 'vitest'
import { probeDependency } from '../../../../infra/http/services/dependency-health'

describe('probeDependency', () => {
  it('should report "up" when the check resolves', async () => {
    await expect(probeDependency(async () => 'PONG', 50)).resolves.toBe('up')
  })

  it('should report "down" when the check rejects', async () => {
    await expect(probeDependency(async () => { throw new Error('ECONNREFUSED') }, 50)).resolves.toBe('down')
  })

  it('should report "down" and abort the check when it exceeds the timeout', async () => {
    let receivedSignal: AbortSignal | undefined

    const status = await probeDependency(signal => {
      receivedSignal = signal
      return new Promise(() => {})
    }, 20)

    expect(status).toBe('down')
    expect(receivedSignal?.aborted).toBe(true)
  })
})
