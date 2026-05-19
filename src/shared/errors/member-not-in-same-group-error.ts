import { AppError } from './app-error'

export class MemberNotInSameGroupError extends AppError {
    constructor() {
        super('Os membros não pertencem ao mesmo grupo', 422)
    }
}
