const errorResponse = {
  type: 'object',
  properties: {
    message: { type: 'string' },
  },
}

const validationErrorResponse = {
  type: 'object',
  properties: {
    message: { type: 'string' },
    issues: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          message: { type: 'string' },
          path: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
}

export const registerSchema = {
  summary: 'Registrar novo usuário',
  description: 'Cria uma nova conta de usuário. Retorna 201 sem corpo em caso de sucesso.',
  tags: ['Auth'],
  body: {
    type: 'object',
    required: ['name', 'email', 'password'],
    properties: {
      name: {
        type: 'string',
        minLength: 1,
        description: 'Nome completo do usuário',
        example: 'João Silva',
      },
      email: {
        type: 'string',
        format: 'email',
        description: 'Email único — será usado para login',
        example: 'joao@email.com',
      },
      password: {
        type: 'string',
        minLength: 6,
        description: 'Mínimo de 6 caracteres',
        example: 'senha123',
      },
    },
  },
  response: {
    201: {
      description: 'Usuário registrado com sucesso',
      type: 'null',
    },
    400: {
      description: 'Payload inválido',
      ...validationErrorResponse,
    },
    409: {
      description: 'Email já cadastrado',
      ...errorResponse,
    },
  },
} as const

export const authSchema = {
  summary: 'Autenticar usuário',
  description:
    'Valida email e senha. Retorna um access token JWT no body e um refresh token como cookie httpOnly.',
  tags: ['Auth'],
  body: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: {
        type: 'string',
        format: 'email',
        example: 'joao@email.com',
      },
      password: {
        type: 'string',
        minLength: 6,
        example: 'senha123',
      },
    },
  },
  response: {
    200: {
      description: 'Autenticado com sucesso. Cookie refreshToken definido automaticamente.',
      type: 'object',
      properties: {
        accessToken: {
          type: 'string',
          description: 'JWT access token com validade de 15 minutos',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
    },
    400: {
      description: 'Payload inválido',
      ...validationErrorResponse,
    },
    401: {
      description: 'Email ou senha incorretos',
      ...errorResponse,
    },
  },
} as const

export const refreshTokenSchema = {
  summary: 'Renovar access token',
  description:
    'Usa o cookie refreshToken (httpOnly) para emitir um novo access token. O refresh token tem validade de 7 dias.',
  tags: ['Auth'],
  response: {
    200: {
      description: 'Access token renovado com sucesso',
      type: 'object',
      properties: {
        accessToken: {
          type: 'string',
          description: 'Novo JWT access token com validade de 15 minutos',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
    },
    401: {
      description: 'Refresh token ausente, expirado ou inválido',
      ...errorResponse,
    },
  },
} as const