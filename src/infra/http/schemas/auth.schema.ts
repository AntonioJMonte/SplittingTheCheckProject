import z from 'zod'

const errorBody = z.object({ message: z.string() })
const validationErrorBody = z.object({
    message: z.string(),
    issues: z.array(z.any()).optional(),
})

export const registerBody = z.object({
    name: z.string().min(1).describe('Nome completo do usuário'),
    email: z.email().describe('Email único — será usado para login'),
    password: z.string().min(6).describe('Mínimo de 6 caracteres'),
})

export const authBody = z.object({
    email: z.email(),
    password: z.string().min(6),
})

export const registerRouteSchema = {
    summary: 'Registrar novo usuário',
    description: 'Cria uma nova conta de usuário. Retorna 201 sem corpo em caso de sucesso.',
    tags: ['Auth'],
    body: registerBody,
    response: {
        201: z.null(),
        400: validationErrorBody,
        409: errorBody,
    },
}

export const authRouteSchema = {
    summary: 'Autenticar usuário',
    description: 'Valida email e senha. Retorna access token JWT e define cookie refreshToken httpOnly.',
    tags: ['Auth'],
    body: authBody,
    response: {
        200: z.object({ accessToken: z.string() }),
        400: validationErrorBody,
        401: errorBody,
    },
}

export const refreshTokenRouteSchema = {
    summary: 'Renovar access token',
    description: 'Usa o cookie refreshToken (httpOnly) para emitir um novo access token com validade de 15 minutos.',
    tags: ['Auth'],
    response: {
        200: z.object({ accessToken: z.string() }),
        401: errorBody,
    },
}
