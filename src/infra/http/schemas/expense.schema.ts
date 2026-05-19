import z from 'zod'

const shareInput = z.object({
    memberId: z.string().uuid(),
    amount: z.number().positive().optional(),
    percentage: z.number().positive().optional(),
})

export const createExpenseBody = z.object({
    description: z.string().min(1),
    amount: z.number().positive(),
    payerId: z.string().uuid(),
    occurredAt: z.string().datetime().optional(),
    splitMethod: z.enum(['EQUAL', 'FIXED', 'PERCENTAGE']),
    shares: z.array(shareInput).min(1),
    category: z.string().optional(),
})

export const updateExpenseBody = z.object({
    description: z.string().min(1).optional(),
    amount: z.number().positive().optional(),
    splitMethod: z.enum(['EQUAL', 'FIXED', 'PERCENTAGE']).optional(),
    shares: z.array(shareInput).min(1).optional(),
})

export const expenseIdParam = z.object({
    expenseId: z.string().uuid(),
})

export const listExpensesQuery = z.object({
    view: z.enum(['all', 'involved', 'paid', 'pending']).optional(),
    category: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    minAmount: z.coerce.number().positive().optional(),
    maxAmount: z.coerce.number().positive().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
})
