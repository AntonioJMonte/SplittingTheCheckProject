import z from 'zod'

const errorBody = z.object({ message: z.string() })

const groupShape = z.object({
    id: z.uuid(),
    name: z.string(),
    currency: z.string(),
    description: z.string().optional(),
})

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
    groupId: z.uuid(),
})

export const createGroupRouteSchema = {
    summary: 'Criar grupo',
    description: 'Cria um novo grupo de despesas. O usuário autenticado é definido automaticamente como OWNER.',
    tags: ['Groups'],
    security: [{ bearerAuth: [] }],
    body: createGroupBody,
    response: {
        201: z.object({ group: groupShape }),
        401: errorBody,
    },
}

export const listGroupsRouteSchema = {
    summary: 'Listar grupos do usuário',
    description: 'Retorna todos os grupos dos quais o usuário autenticado é membro.',
    tags: ['Groups'],
    security: [{ bearerAuth: [] }],
    response: {
        200: z.object({ groups: z.array(groupShape) }),
        401: errorBody,
    },
}

export const updateGroupRouteSchema = {
    summary: 'Atualizar grupo',
    description: 'Atualiza nome, descrição ou moeda do grupo. Requer papel OWNER.',
    tags: ['Groups'],
    security: [{ bearerAuth: [] }],
    params: groupIdParam,
    body: updateGroupBody,
    response: {
        200: z.object({ group: groupShape }),
        401: errorBody,
        403: errorBody,
        404: errorBody,
    },
}

export const deleteGroupRouteSchema = {
    summary: 'Excluir grupo',
    description: 'Remove o grupo permanentemente. Requer papel OWNER.',
    tags: ['Groups'],
    security: [{ bearerAuth: [] }],
    params: groupIdParam,
    response: {
        401: errorBody,
        403: errorBody,
        404: errorBody,
    },
}

const memberBalanceShape = z.object({
    memberId: z.uuid(),
    userId: z.uuid(),
    balance: z.string(),
})

const transferShape = z.object({
    fromMemberId: z.uuid(),
    toMemberId: z.uuid(),
    amount: z.string(),
})

export const getGroupBalancesRouteSchema = {
    summary: 'Consultar saldos do grupo',
    description: 'Calcula e retorna o saldo de cada membro e as transferências sugeridas para quitar as dívidas.',
    tags: ['Groups'],
    security: [{ bearerAuth: [] }],
    params: groupIdParam,
    response: {
        200: z.object({
            memberBalances: z.array(memberBalanceShape),
            transfers: z.array(transferShape),
        }),
        401: errorBody,
        403: errorBody,
        404: errorBody,
    },
}
