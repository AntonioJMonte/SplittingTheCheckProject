import { AppError } from "./app-error";

export class PhoneAlreadyInUseError extends AppError {
    constructor() {
        super('Este telefone já está vinculado a outra conta', 409)
    }
}
