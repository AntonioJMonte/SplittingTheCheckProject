import { AppError } from './app-error'

export class SettlementAlreadyConfirmedError extends AppError {
    constructor() {
        super('Este acerto já foi confirmado', 409)
    }
}
