import { FastifyInstance } from 'fastify'
import { verifyJwt } from '../middlewares/verify-jwt'
import { updateExpense } from '../controllers/update-expense-controller'
import { deleteExpense } from '../controllers/delete-expense-controller'

export async function expenseRoutes(app: FastifyInstance) {
    app.addHook('preHandler', verifyJwt)

    app.patch('/expenses/:expenseId', updateExpense)
    app.delete('/expenses/:expenseId', deleteExpense)
}
