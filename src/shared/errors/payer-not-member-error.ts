import { AppError } from './app-error'

export class PayerNotMemberError extends AppError {
    constructor() {
        super('Pagador não é membro do grupo', 403)
    }
}