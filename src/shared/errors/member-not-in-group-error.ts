import { AppError } from './app-error'

export class MemberNotInGroupError extends AppError {
    constructor(memberId: string) {
        super(`Membro ${memberId} não pertence ao grupo`, 422)
    }
}