import { FastifyInstance } from 'fastify'
import { verifyJwt } from '../middlewares/verify-jwt'
import { createGroup } from '../controllers/create-group-controller'
import { listGroups } from '../controllers/list-groups-controller'
import { updateGroup } from '../controllers/update-group-controller'
import { deleteGroup } from '../controllers/delete-group-controller'
import { addMember } from '../controllers/add-member-controller'
import { removeMember } from '../controllers/remove-member-controller'
import { leaveGroup } from '../controllers/leave-group-controller'
import { listMembers } from '../controllers/list-member-controller'
import { updateMemberRole } from '../controllers/update-member-role-controller'
import { getGroupBalances } from '../controllers/get-group-balances-controller'
import { createExpense } from '../controllers/create-expense-controller'
import { listExpenses } from '../controllers/list-expenses-controller'
import { computeSettlements } from '../controllers/compute-settlements-controller'
import { confirmSettlement } from '../controllers/confirm-settlement-controller'

export async function groupRoutes(app: FastifyInstance) {
    app.addHook('preHandler', verifyJwt)

    // grupos
    app.post('/groups', createGroup)
    app.get('/groups', listGroups)
    app.patch('/groups/:groupId', updateGroup)
    app.delete('/groups/:groupId', deleteGroup)

    // membros
    app.post('/groups/:groupId/members', addMember)
    app.delete('/groups/:groupId/members/:memberId', removeMember)
    app.delete('/groups/:groupId/leave', leaveGroup)
    app.get('/groups/:groupId/members', listMembers)
    app.patch('/groups/:groupId/members/:memberId/role', updateMemberRole)
    app.get('/groups/:groupId/balances', getGroupBalances)

    // despesas do grupo
    app.post('/groups/:groupId/expenses', createExpense)
    app.get('/groups/:groupId/expenses', listExpenses)

    // acertos do grupo
    app.get('/groups/:groupId/settlements/compute', computeSettlements)
    app.post('/groups/:groupId/settlements', confirmSettlement)
}
