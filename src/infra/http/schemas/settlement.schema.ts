import z from 'zod'

export const confirmSettlementBody = z.object({
    fromMemberId: z.string().uuid(),
    toMemberId: z.string().uuid(),
    amount: z.number().positive(),
})

export const settlementIdParam = z.object({
    settlementId: z.string().uuid(),
})
