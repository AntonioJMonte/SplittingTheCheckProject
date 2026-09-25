import z from 'zod'
import { badRequest, notFound, unauthorized } from './shared.schema'

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
