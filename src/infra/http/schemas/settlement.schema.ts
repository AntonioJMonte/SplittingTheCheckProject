import z from 'zod'

const errorBody = z.object({ message: z.string() })

export const confirmSettlementBody = z.object({
    fromMemberId: z.uuid(),
    toMemberId: z.uuid(),
    amount: z.number().positive(),
})

export const settlementIdParam = z.object({
    settlementId: z.uuid(),
})

const groupIdParam = z.object({ groupId: z.uuid() })

const settlementShape = z.object({
    id: z.uuid(),
    fromMemberId: z.uuid(),
    toMemberId: z.uuid(),
    amount: z.string(),
    status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED']),
    pixCopyPaste: z.string().nullable().optional(),
    confirmedAt: z.date().nullable().optional(),
})

const computedSettlementShape = z.object({
    fromMemberId: z.uuid(),
    fromMemberName: z.string(),
    toMemberId: z.uuid(),
    toMemberName: z.string(),
    amount: z.string(),
})

export const computeSettlementsRouteSchema = {
    summary: 'Calcular acertos sugeridos',
    description: 'Calcula as transferências mínimas necessárias para quitar todas as dívidas do grupo usando o algoritmo DebtMinimizer.',
    tags: ['Settlements'],
    security: [{ bearerAuth: [] }],
    params: groupIdParam,
    response: {
        200: z.object({ settlements: z.array(computedSettlementShape) }),
        401: errorBody,
        403: errorBody,
        404: errorBody,
    },
}

export const confirmSettlementRouteSchema = {
    summary: 'Registrar acerto',
    description: 'O devedor registra um pagamento ao credor. O valor não pode exceder a dívida calculada. Gera copia-e-cola Pix se o credor tiver chave Pix cadastrada.',
    tags: ['Settlements'],
    security: [{ bearerAuth: [] }],
    params: groupIdParam,
    body: confirmSettlementBody,
    response: {
        201: z.object({ settlement: settlementShape }),
        401: errorBody,
        403: errorBody,
        404: errorBody,
        422: errorBody,
    },
}

export const acknowledgeSettlementRouteSchema = {
    summary: 'Confirmar recebimento do acerto',
    description: 'O credor confirma que recebeu o pagamento, encerrando o acerto com status CONFIRMED.',
    tags: ['Settlements'],
    security: [{ bearerAuth: [] }],
    params: settlementIdParam,
    response: {
        200: z.object({ settlement: settlementShape }),
        401: errorBody,
        403: errorBody,
        404: errorBody,
    },
}
