import { makeCategorizeExpenseUseCase } from '../../factories/make-categorize-expense-use-case'
import { io } from '../../websocket/io'
import { emitExpenseCategorized } from '../../websocket/handlers/expense-events'
import { logger } from '../../logger/logger'

interface ExpenseCategorizationJob {
    expenseId: string
    groupId: string
    requestUserId: string
}

// Fire-and-forget by design: the HTTP response never waits for the LLM. Work lost on a crash is
// acceptable because categories are non-critical and POST /expenses/:id/categorize can redo it.
export function dispatchExpenseCategorization({ expenseId, groupId, requestUserId }: ExpenseCategorizationJob): Promise<void> {
    return makeCategorizeExpenseUseCase()
        .execute({ expenseId, requestUserId })
        .then(async ({ expense, updated }) => {
            if (updated && io && expense.category) {
                await emitExpenseCategorized(io, groupId, expense.id, expense.category)
            }
        })
        .catch(error => {
            logger.error({ err: error, expenseId }, 'Falha na categorização em background')
        })
}
