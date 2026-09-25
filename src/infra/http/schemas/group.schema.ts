import z from 'zod'
import { memberWithUserShape } from './member.schema'
import { badRequest, forbidden, notFound, unauthorized } from './shared.schema'

const groupShape = z.object({
    id: z.uuid(),
    name: z.string(),
    currency: z.string(),
    description: z.string().optional(),
})

export const createGroupBody = z.object({
    name: z.string().min(1).describe('Nome exibido do grupo'),
    description: z.string().optional(),
    currency: z.string().optional().default('BRL').describe('Código ISO da moeda; padrão BRL'),
}).meta({
    example: { name: 'Viagem Europa', description: 'Rateio da viagem de julho', currency: 'EUR' },
})

export const updateGroupBody = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    currency: z.string().optional(),
}).meta({
    example: { name: 'Viagem Europa 2026' },
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
        201: z.object({ group: groupShape }).describe('Grupo criado'),
        400: badRequest,
        401: unauthorized,
    },
}

export const listGroupsRouteSchema = {
    summary: 'Listar grupos do usuário',
    description: 'Retorna todos os grupos dos quais o usuário autenticado é membro.',
    tags: ['Groups'],
    security: [{ bearerAuth: [] }],
    response: {
        200: z.object({ groups: z.array(groupShape) }).describe('Grupos do usuário autenticado'),
        401: unauthorized,
    },
}

export const getGroupRouteSchema = {
    summary: 'Consultar grupo',
    description: 'Retorna os detalhes do grupo e a lista de membros com nome e email. Os saldos ficam em GET /groups/:groupId/balances.',
    tags: ['Groups'],
    security: [{ bearerAuth: [] }],
    params: groupIdParam,
    response: {
        200: z.object({
            group: groupShape.extend({ members: z.array(memberWithUserShape) }),
        }).describe('Detalhes do grupo e seus membros'),
        400: badRequest,
        401: unauthorized,
        403: forbidden,
        404: notFound,
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
        200: z.object({ group: groupShape }).describe('Grupo atualizado'),
        400: badRequest,
        401: unauthorized,
        403: forbidden,
        404: notFound,
    },
}

export const deleteGroupRouteSchema = {
    summary: 'Excluir grupo',
    description: 'Remove o grupo permanentemente. Requer papel OWNER.',
    tags: ['Groups'],
    security: [{ bearerAuth: [] }],
    params: groupIdParam,
    response: {
        204: z.null().describe('Grupo excluído'),
        400: badRequest,
        401: unauthorized,
        403: forbidden,
        404: notFound,
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
        }).describe('Saldo por membro e transferências sugeridas'),
        400: badRequest,
        401: unauthorized,
        403: forbidden,
        404: notFound,
    },
}
