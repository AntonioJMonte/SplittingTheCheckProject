import fastify from 'fastify'
import fastifyJwt from '@fastify/jwt'
import fastifyCookie from '@fastify/cookie'
import fastifySwagger from '@fastify/swagger'
import fastifySwaggerUi from '@fastify/swagger-ui'
import { ZodError } from 'zod'
import { DomainError } from '../../shared/errors/domain-error'
import { env } from '../env'
import { userRoutes } from './routes/userRoutes'
import { groupRoutes } from './routes/groupRoutes'
import { expenseRoutes } from './routes/expenseRoutes'
import { settlementRoutes } from './routes/settlementRoutes'

export const app = fastify({
  ajv: {
    customOptions: {
      strict: false,
    },
  },
})

app.register(fastifySwagger, {
  openapi: {
    openapi: '3.0.3',
    info: {
      title: 'Plataforma de Rachamento de Contas',
      description:
        'API REST para grupos compartilharem despesas e calcularem automaticamente ' +
        'quem deve a quem, com algoritmo de minimização de transações.',
      version: '1.0.0',
    },
    servers: [{ url: `http://localhost:${env.PORT}`, description: 'Servidor local' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Access token JWT obtido em POST /auth',
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Registro, login e renovação de token' },
      { name: 'Groups', description: 'Gerenciamento de grupos e membros' },
      { name: 'Expenses', description: 'Lançamento e consulta de despesas' },
      { name: 'Settlements', description: 'Cálculo e confirmação de acertos' },
    ],
  },
})

app.register(fastifySwaggerUi, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: true,
  },
  staticCSP: true,
})

app.register(fastifyJwt, {
  secret: env.JWT_SECRET,
  cookie: {
    cookieName: 'refreshToken',
    signed: false,
  },
  sign: {
    expiresIn: env.JWT_EXPIRES_IN,
  },
})

app.register(fastifyCookie)

app.register(userRoutes)
app.register(groupRoutes)
app.register(expenseRoutes)
app.register(settlementRoutes)

app.setErrorHandler((error, _, reply) => {
  if (error instanceof ZodError) {
    return reply
      .status(400)
      .send({ message: 'Validation error.', issues: error.issues })
  }

  if (error instanceof DomainError) {
    return reply.status(400).send({ message: error.message })
  }

  const err = error as { statusCode?: number; message?: string }
  if (err.statusCode && err.statusCode < 500) {
    return reply.status(err.statusCode).send({ message: err.message })
  }

  if (process.env.NODE_ENV !== 'production') {
    console.error(error)
  }

  return reply.status(500).send({ message: 'Internal server error.' })
})
