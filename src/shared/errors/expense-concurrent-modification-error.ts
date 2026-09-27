import { AppError } from "./app-error";

// D-82: mesmo padrão do acerto — quem editou leu uma versão que já não é a atual.
export class ExpenseConcurrentModificationError extends AppError {
    constructor() {
        super('A despesa foi alterada por outra operação. Recarregue e tente novamente.', 409)
    }
}
