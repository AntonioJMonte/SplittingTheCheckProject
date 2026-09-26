import type { CookieSerializeOptions } from '@fastify/cookie'
import { env } from '../env'

// D-59: um frontend em outro domínio só recebe e reenvia este cookie com SameSite=None, que o
// navegador exige acompanhado de Secure. Fora de produção API e frontend ficam ambos em
// localhost — mesmo site, portas diferentes — então Lax basta e preserva a defesa contra CSRF.
// As mesmas opções valem na limpeza: em requisição cross-site o navegador descarta um
// Set-Cookie que não venha com SameSite=None, e o logout deixaria o cookie para trás.
export const refreshTokenCookieOptions: CookieSerializeOptions = {
  path: '/',
  httpOnly: true,
  secure: true,
  sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
}
