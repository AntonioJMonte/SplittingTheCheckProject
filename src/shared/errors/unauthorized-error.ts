import { AppError } from './app-error'

export class UnauthorizedError extends AppError {
    constructor() {
        super('Você não tem permissão para realizar esta ação', 403)
    }
}
