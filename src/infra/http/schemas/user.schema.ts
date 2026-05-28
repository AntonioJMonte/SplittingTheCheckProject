import z from 'zod'

const errorBody = z.object({ message: z.string() })

export const updatePixKeyBody = z.object({
    pixKey: z.string().min(1).nullable().optional(),
})

export const updatePixKeyRouteSchema = {
    summary: 'Atualizar chave Pix',
    description: 'Define ou remove a chave Pix do usuário autenticado. Enviar null remove a chave existente.',
    tags: ['Users'],
    security: [{ bearerAuth: [] }],
    body: updatePixKeyBody,
    response: {
        200: z.object({ message: z.string() }),
        401: errorBody,
        404: errorBody,
    },
}
