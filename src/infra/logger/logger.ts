import pino from 'pino'
import { env } from '../env'

export const logger = pino({
    // Em teste o nível é forçado: os 270+ specs sobem o app e não devem sujar a saída.
    level: env.NODE_ENV === 'test' ? 'silent' : env.LOG_LEVEL,
    redact: {
        paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'res.headers["set-cookie"]',
            '*.password',
            '*.passwordHash',
            '*.refreshToken',
            '*.pixKey',
        ],
        censor: '[REDACTED]',
    },
    transport: env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
})
