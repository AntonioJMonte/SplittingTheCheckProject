import z from 'zod'

export const addMemberBody = z.object({
    userId: z.string().uuid(),
})

export const updateMemberRoleBody = z.object({
    newRole: z.enum(['OWNER', 'MEMBER']),
})

export const memberIdParam = z.object({
    memberId: z.string().uuid(),
})
