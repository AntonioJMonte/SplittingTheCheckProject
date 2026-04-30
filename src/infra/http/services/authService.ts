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

  verifyRefreshToken(token: string): { sub: string } {
    return verify(token, env.JWT_REFRESH_SECRET) as { sub: string }
  },
}
