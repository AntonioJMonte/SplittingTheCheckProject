import { AppError } from './app-error'

export class AmountExceedsDebtError extends AppError {
    constructor() {
        super('O valor informado excede a dívida do membro', 422)
    }
}
