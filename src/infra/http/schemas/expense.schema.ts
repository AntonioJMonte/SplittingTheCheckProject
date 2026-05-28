import z from 'zod'

const errorBody = z.object({ message: z.string() })

const shareInput = z.object({
    memberId: z.uuid(),
    amount: z.number().positive().optional(),
    percentage: z.number().positive().optional(),
})

export const createExpenseBody = z.object({
    description: z.string().min(1),
    amount: z.number().positive(),
    payerId: z.uuid(),
    occurredAt: z.iso.datetime().optional(),
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
    expenseId: z.uuid(),
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

const groupIdParam = z.object({ groupId: z.uuid() })

const expenseShareShape = z.object({
    id: z.uuid(),
    memberId: z.uuid(),
    amount: z.string(),
})

const expenseShape = z.object({
    id: z.uuid(),
    groupId: z.uuid(),
    payerId: z.uuid(),
    description: z.string(),
    amount: z.string(),
    splitMethod: z.enum(['EQUAL', 'FIXED', 'PERCENTAGE']),
    occurredAt: z.date(),
    category: z.string().optional(),
    shares: z.array(expenseShareShape),
})

export const createExpenseRouteSchema = {
    summary: 'Criar despesa',
    description: 'Registra uma despesa no grupo, distribuindo o valor entre os membros conforme o método de divisão (EQUAL, FIXED ou PERCENTAGE).',
    tags: ['Expenses'],
    security: [{ bearerAuth: [] }],
    params: groupIdParam,
    body: createExpenseBody,
    response: {
        201: z.object({ expense: expenseShape }),
        400: errorBody,
        401: errorBody,
        403: errorBody,
        404: errorBody,
    },
}

export const listExpensesRouteSchema = {
    summary: 'Listar despesas do grupo',
    description: 'Retorna as despesas do grupo com suporte a filtros por categoria, data, valor e paginação.',
    tags: ['Expenses'],
    security: [{ bearerAuth: [] }],
    params: groupIdParam,
    querystring: listExpensesQuery,
    response: {
        200: z.object({
            expenses: z.array(expenseShape),
            total: z.number().int(),
        }),
        401: errorBody,
        403: errorBody,
        404: errorBody,
    },
}

export const updateExpenseRouteSchema = {
    summary: 'Atualizar despesa',
    description: 'Edita descrição, valor ou divisão de uma despesa. Apenas o pagador ou OWNER podem editar.',
    tags: ['Expenses'],
    security: [{ bearerAuth: [] }],
    params: expenseIdParam,
    body: updateExpenseBody,
    response: {
        200: z.object({ expense: expenseShape }),
        400: errorBody,
        401: errorBody,
        403: errorBody,
        404: errorBody,
    },
}

export const deleteExpenseRouteSchema = {
    summary: 'Excluir despesa',
    description: 'Remove uma despesa permanentemente. Apenas o pagador ou OWNER podem excluir.',
    tags: ['Expenses'],
    security: [{ bearerAuth: [] }],
    params: expenseIdParam,
    response: {
        401: errorBody,
        403: errorBody,
        404: errorBody,
    },
}
