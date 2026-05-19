import { AppError } from './app-error'

export class MemberNotFoundError extends AppError {
    constructor() {
        super('Membro não encontrado', 404)
    }
}
