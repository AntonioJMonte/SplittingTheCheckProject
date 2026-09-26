import { describe, it, expect, afterEach, vi } from 'vitest'

// O env é mockado em vez de reimportado com NODE_ENV trocado: recarregar o módulo real puxa
// `dotenv/config` de novo, e o banner que o dotenv escreve no console escapa do ciclo do teste.
async function loadOptions(nodeEnv: string) {
    vi.resetModules()
    vi.doMock('../../../../infra/env', () => ({ env: { NODE_ENV: nodeEnv } }))
    const { refreshTokenCookieOptions } = await import('../../../../infra/http/refresh-token-cookie')
    return refreshTokenCookieOptions
}

describe('refreshTokenCookieOptions (D-59)', () => {
    afterEach(() => {
        vi.doUnmock('../../../../infra/env')
        vi.resetModules()
    })

    it('usa SameSite=None em produção, para o cookie sobreviver a um frontend cross-site', async () => {
        const options = await loadOptions('production')

        expect(options.sameSite).toBe('none')
        // None sem Secure é recusado pelo navegador.
        expect(options.secure).toBe(true)
    })

    it.each(['development', 'test'])('usa SameSite=Lax em %s', async nodeEnv => {
        const options = await loadOptions(nodeEnv)

        expect(options.sameSite).toBe('lax')
    })

    it('mantém o cookie httpOnly e no escopo da raiz em qualquer ambiente', async () => {
        const options = await loadOptions('production')

        expect(options.httpOnly).toBe(true)
        expect(options.path).toBe('/')
    })
})
