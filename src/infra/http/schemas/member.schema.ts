import z from 'zod'

const errorBody = z.object({ message: z.string() })

export const addMemberBody = z.object({
    userId: z.uuid(),
})

export const updateMemberRoleBody = z.object({
    newRole: z.enum(['OWNER', 'MEMBER']),
})

export const memberIdParam = z.object({
    memberId: z.uuid(),
})

const groupIdParam = z.object({ groupId: z.uuid() })
const groupAndMemberParams = z.object({ groupId: z.uuid(), memberId: z.uuid() })

const memberShape = z.object({
    id: z.uuid(),
    userId: z.uuid(),
    groupId: z.uuid(),
    role: z.enum(['OWNER', 'MEMBER']),
    joinedAt: z.date(),
})

const memberWithUserShape = z.object({
    id: z.uuid(),
    role: z.enum(['OWNER', 'MEMBER']),
    joinedAt: z.date(),
    name: z.string(),
    email: z.string(),
})

export const addMemberRouteSchema = {
    summary: 'Adicionar membro ao grupo',
    description: 'Adiciona um usuário existente ao grupo como MEMBER. Requer papel OWNER.',
    tags: ['Groups'],
    security: [{ bearerAuth: [] }],
    params: groupIdParam,
    body: addMemberBody,
    response: {
        201: z.object({ member: memberShape }),
        400: errorBody,
        401: errorBody,
        403: errorBody,
        404: errorBody,
    },
}

export const removeMemberRouteSchema = {
    summary: 'Remover membro do grupo',
    description: 'Remove um membro do grupo. Requer papel OWNER. O membro não pode ter saldo pendente.',
    tags: ['Groups'],
    security: [{ bearerAuth: [] }],
    params: groupAndMemberParams,
    response: {
        401: errorBody,
        403: errorBody,
        404: errorBody,
    },
}

export const leaveGroupRouteSchema = {
    summary: 'Sair do grupo',
    description: 'Remove o usuário autenticado do grupo. O OWNER só pode sair se for o único membro.',
    tags: ['Groups'],
    security: [{ bearerAuth: [] }],
    params: groupIdParam,
    response: {
        401: errorBody,
        403: errorBody,
    },
}

export const listMembersRouteSchema = {
    summary: 'Listar membros do grupo',
    description: 'Retorna todos os membros do grupo com suas informações de usuário.',
    tags: ['Groups'],
    security: [{ bearerAuth: [] }],
    params: groupIdParam,
    response: {
        200: z.object({ members: z.array(memberWithUserShape) }),
        401: errorBody,
        403: errorBody,
        404: errorBody,
    },
}

export const updateMemberRoleRouteSchema = {
    summary: 'Atualizar papel do membro',
    description: 'Promove ou rebaixa um membro. Requer papel OWNER. Não é possível rebaixar o único OWNER.',
    tags: ['Groups'],
    security: [{ bearerAuth: [] }],
    params: groupAndMemberParams,
    body: updateMemberRoleBody,
    response: {
        200: z.object({ memberId: z.uuid(), role: z.enum(['OWNER', 'MEMBER']) }),
        400: errorBody,
        401: errorBody,
        403: errorBody,
        404: errorBody,
    },
}
