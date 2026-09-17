import { AppError } from './app-error'

export class ConcurrentModificationError extends AppError {
    constructor() {
        super('O acerto foi alterado por outra operação. Recarregue e tente novamente.', 409)
    }
}
