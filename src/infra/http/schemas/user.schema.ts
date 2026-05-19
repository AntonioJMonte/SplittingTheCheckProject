import z from 'zod'

export const updatePixKeyBody = z.object({
    pixKey: z.string().min(1).nullable().optional(),
})
