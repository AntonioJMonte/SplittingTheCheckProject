import z from 'zod'
import { badRequest, conflict, notFound, unauthorized } from './shared.schema'

export const updatePixKeyBody = z.object({
    pixKey: z.string().min(1).nullable().optional().describe('Chave Pix em qualquer formato aceito pelo banco; null remove'),
}).meta({
    example: { pixKey: 'ana@example.com' },
})

export const updatePixKeyRouteSchema = {
    summary: 'Atualizar chave Pix',
    description: 'Define ou remove a chave Pix do usuário autenticado. Enviar null remove a chave existente.',
    tags: ['Users'],
    security: [{ bearerAuth: [] }],
    body: updatePixKeyBody,
    response: {
        200: z.object({ message: z.string() }).describe('Chave Pix atualizada'),
        400: badRequest,
        401: unauthorized,
        404: notFound,
    },
}

export const updatePhoneBody = z.object({
    phone: z.string().min(1).nullable().optional().describe('Telefone em qualquer formato; normalizado para E.164. null remove'),
}).meta({
    example: { phone: '(11) 98765-4321' },
})

export const updatePhoneRouteSchema = {
    summary: 'Atualizar telefone',
    description: 'Define ou remove o telefone do usuário autenticado. O número é normalizado para E.164 e serve para ser convidado a grupos. Enviar null remove.',
    tags: ['Users'],
    security: [{ bearerAuth: [] }],
    body: updatePhoneBody,
    response: {
        200: z.object({ message: z.string() }).describe('Telefone atualizado'),
        400: badRequest,
        401: unauthorized,
        404: notFound,
        409: conflict,
    },
}
