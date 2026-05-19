import { AppError } from './app-error'

export class ExpenseNotFoundError extends AppError {
    constructor() {
        super('Despesa não encontrada', 404)
    }
}
