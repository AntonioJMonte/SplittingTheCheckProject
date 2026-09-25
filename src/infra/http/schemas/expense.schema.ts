import z from 'zod'
import { EXPENSE_CATEGORIES } from '../../../domain/value-objects/expense-category'
import { badRequest, forbidden, notFound, unauthorized } from './shared.schema'

const expenseCategory = z.enum(EXPENSE_CATEGORIES)

const shareInput = z.object({
    memberId: z.uuid(),
    amount: z.number().positive().optional().describe('Valor fixo da parte; use com splitMethod FIXED'),
    percentage: z.number().positive().optional().describe('Percentual da parte; use com splitMethod PERCENTAGE'),
})

export const createExpenseBody = z.object({
    description: z.string().min(1).describe('Texto usado também pela categorização automática'),
    amount: z.number().positive(),
    payerId: z.uuid().describe('Id do usuário que pagou'),
    occurredAt: z.iso.datetime().optional().describe('Data da despesa em ISO 8601; padrão é agora'),
    splitMethod: z.enum(['EQUAL', 'FIXED', 'PERCENTAGE']),
    shares: z.array(shareInput).min(1).describe('Uma entrada por membro que participa do rateio'),
    category: expenseCategory.optional().describe('Informar a categoria desliga a categorização automática'),
}).meta({
    example: {
        description: 'Jantar no restaurante',
        amount: 180.5,
        payerId: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
        splitMethod: 'EQUAL',
        shares: [
            { memberId: '3f2504e0-4f89-41d3-9a0c-0305e82c3302' },
            { memberId: '3f2504e0-4f89-41d3-9a0c-0305e82c3303' },
        ],
    },
})

export const updateExpenseBody = z.object({
    description: z.string().min(1).optional(),
    amount: z.number().positive().optional(),
    splitMethod: z.enum(['EQUAL', 'FIXED', 'PERCENTAGE']).optional(),
    shares: z.array(shareInput).min(1).optional(),
    category: expenseCategory.optional(),
}).meta({
    example: { description: 'Jantar no restaurante japonês', amount: 210 },
})

export const expenseIdParam = z.object({
    expenseId: z.uuid(),
})

export const listExpensesQuery = z.object({
    view: z.enum(['all', 'involved', 'paid', 'pending']).optional().describe('Recorte da lista; padrão all'),
    category: expenseCategory.optional(),
    startDate: z.string().optional().describe('Data inicial em ISO 8601'),
    endDate: z.string().optional().describe('Data final em ISO 8601'),
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
    category: expenseCategory.optional(),
    shares: z.array(expenseShareShape),
})

export const createExpenseRouteSchema = {
    summary: 'Criar despesa',
    description: 'Registra uma despesa no grupo, distribuindo o valor entre os membros conforme o método de divisão (EQUAL, FIXED ou PERCENTAGE). Sem `category`, regras e cache categorizam na hora; se não decidirem, a categoria chega depois pelo evento `expense_categorized`.',
    tags: ['Expenses'],
    security: [{ bearerAuth: [] }],
    params: groupIdParam,
    body: createExpenseBody,
    response: {
        201: z.object({ expense: expenseShape }).describe('Despesa criada'),
        400: badRequest,
        401: unauthorized,
        403: forbidden,
        404: notFound,
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
        }).describe('Despesas do grupo e o total sem paginação'),
        400: badRequest,
        401: unauthorized,
        403: forbidden,
        404: notFound,
    },
}

export const updateExpenseRouteSchema = {
    summary: 'Atualizar despesa',
    description: 'Edita descrição, valor, divisão ou categoria de uma despesa. Apenas o pagador ou OWNER podem editar. Mudar a descrição sem enviar `category` recategoriza automaticamente.',
    tags: ['Expenses'],
    security: [{ bearerAuth: [] }],
    params: expenseIdParam,
    body: updateExpenseBody,
    response: {
        200: z.object({ expense: expenseShape }).describe('Despesa atualizada'),
        400: badRequest,
        401: unauthorized,
        403: forbidden,
        404: notFound,
    },
}

export const categorizeExpenseRouteSchema = {
    summary: 'Recategorizar despesa automaticamente',
    description: 'Roda a categorização automática (regras → cache → LLM → Outros) e sobrescreve a categoria atual. Qualquer membro do grupo da despesa pode solicitar. Emite o evento `expense_categorized`.',
    tags: ['Expenses'],
    security: [{ bearerAuth: [] }],
    params: expenseIdParam,
    response: {
        200: z.object({ expense: expenseShape }).describe('Despesa com a categoria recalculada'),
        400: badRequest,
        401: unauthorized,
        403: forbidden,
        404: notFound,
    },
}

export const deleteExpenseRouteSchema = {
    summary: 'Excluir despesa',
    description: 'Remove uma despesa permanentemente. Apenas o pagador ou OWNER podem excluir.',
    tags: ['Expenses'],
    security: [{ bearerAuth: [] }],
    params: expenseIdParam,
    response: {
        204: z.null().describe('Despesa excluída'),
        400: badRequest,
        401: unauthorized,
        403: forbidden,
        404: notFound,
    },
}
