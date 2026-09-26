import { sign, verify } from 'jsonwebtoken'
import { env } from '../../env'

export const authService = {
  signRefreshToken(userId: string): string {
    return sign(
      { sub: userId },
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRES_IN } as Parameters<typeof sign>[2],
    )
  },

  // `exp` é opcional de propósito: um JWT válido pode não trazer a claim, e afirmar que ela é
  // sempre `number` esconderia o caso de quem usa o valor. Quando existe, define o TTL da entrada
  // na blacklist — a revogação expira junto com o token, sem deixar chave órfã no Redis.
  verifyRefreshToken(token: string): { sub: string; exp?: number } {
    return verify(token, env.JWT_REFRESH_SECRET) as { sub: string; exp?: number }
  },
}
