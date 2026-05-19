import { AppError } from './app-error'

export class GroupNotFoundError extends AppError {
    constructor() {
        super('Grupo não encontrado', 404)
    }
}