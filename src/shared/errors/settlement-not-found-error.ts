import { AppError } from './app-error'

export class SettlementNotFoundError extends AppError {
    constructor() {
        super('Acerto não encontrado', 404)
    }
}
