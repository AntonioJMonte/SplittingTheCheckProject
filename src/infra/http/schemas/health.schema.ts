import z from 'zod'

const dependencyStatus = z.enum(['up', 'down'])

const healthBody = z.object({
    status: z.enum(['ok', 'degraded']),
    checks: z.object({
        database: dependencyStatus,
        redis: dependencyStatus,
    }),
})

export const healthRouteSchema = {
    summary: 'Verificar saúde da API',
    description: 'Checa a conexão com Postgres e Redis. Não exige autenticação; é usado pelo healthcheck do Docker Compose. Responde 503 se alguma dependência estiver fora.',
    tags: ['Health'],
    response: {
        200: healthBody.describe('API e dependências no ar'),
        503: healthBody.describe('Alguma dependência está fora'),
    },
}
