import z from 'zod'
import { badRequest, conflict, unauthorized } from './shared.schema'

export const registerBody = z.object({
    name: z.string().min(1).describe('Nome completo do usuário'),
    email: z.email().describe('Email único — será usado para login'),
    password: z.string().min(6).describe('Mínimo de 6 caracteres'),
}).meta({
    example: { name: 'Ana Souza', email: 'ana@example.com', password: 'senha-forte-123' },
})

export const authBody = z.object({
    email: z.email(),
    password: z.string().min(6),
}).meta({
    example: { email: 'ana@example.com', password: 'senha-forte-123' },
})

export const registerRouteSchema = {
    summary: 'Registrar novo usuário',
    description: 'Cria uma nova conta de usuário. Retorna 201 sem corpo em caso de sucesso.',
    tags: ['Auth'],
    body: registerBody,
    response: {
        201: z.null().describe('Conta criada'),
        400: badRequest,
        409: conflict,
    },
}

export const authRouteSchema = {
    summary: 'Autenticar usuário',
    description: 'Valida email e senha. Retorna access token JWT e define cookie refreshToken httpOnly.',
    tags: ['Auth'],
    body: authBody,
    response: {
        200: z.object({ accessToken: z.string() }).describe('Autenticado; o refresh token vai no cookie httpOnly'),
        400: badRequest,
        401: unauthorized,
    },
}

export const refreshTokenRouteSchema = {
    summary: 'Renovar access token',
    description: 'Usa o cookie refreshToken (httpOnly) para emitir um novo access token com validade de 15 minutos.',
    tags: ['Auth'],
    response: {
        200: z.object({ accessToken: z.string() }).describe('Novo access token emitido'),
        401: unauthorized,
    },
}

export const logoutRouteSchema = {
    summary: 'Encerrar sessão',
    description:
        'Revoga o refresh token do cookie e o remove do navegador. É idempotente: responde 204 mesmo ' +
        'sem cookie, com token inválido ou com token já revogado. O access token em uso continua ' +
        'valendo até expirar (máximo de 15 minutos).',
    tags: ['Auth'],
    response: {
        204: z.null().describe('Sessão encerrada'),
    },
}
