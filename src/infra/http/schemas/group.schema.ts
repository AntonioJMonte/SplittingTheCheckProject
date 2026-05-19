import z from 'zod'

export const createGroupBody = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    currency: z.string().optional().default('BRL'),
})

export const updateGroupBody = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    currency: z.string().optional(),
})

export const groupIdParam = z.object({
    groupId: z.string().uuid(),
})
