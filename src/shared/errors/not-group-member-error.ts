import { AppError } from './app-error'

export class NotGroupMemberError extends AppError {
    constructor() {
        super('Você não é membro deste grupo', 403)
    }
}
