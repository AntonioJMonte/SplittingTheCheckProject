import { AppError } from './app-error'

export class SettlementCancelledError extends AppError {
    constructor() {
        super('Este acerto foi cancelado e não pode ser confirmado', 409)
    }
}
