import { AppError } from './app-error'

export class MemberHasPendingBalanceError extends AppError {
    constructor() {
        super('Membro possui saldo pendente e não pode ser removido do grupo', 400)
    }
}
