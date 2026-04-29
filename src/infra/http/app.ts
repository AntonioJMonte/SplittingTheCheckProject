import fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { env } from '../env/index.js'

export function buildApp() {
  const app = fastify({
    logger: {
      transport:
        env.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
  })

  app.register(cors, { origin: true })

  app.register(jwt, { secret: env.JWT_SECRET })

  app.register(swagger, {
    openapi: {
      info: {
        title: 'Rachamento de Contas API',
        description: 'API para grupos compartilharem despesas',
        version: '1.0.0',
      },
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
    },
  })

  app.register(swaggerUi, { routePrefix: '/docs' })

  return app
}
