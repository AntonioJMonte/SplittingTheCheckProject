import { AppError } from './app-error'

export class SettlementAlreadyPendingError extends AppError {
    constructor() {
        super('Já existe um acerto pendente entre esses membros', 409)
    }
}
