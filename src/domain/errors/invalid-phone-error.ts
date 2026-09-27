import { DomainError } from '../../shared/errors/domain-error'

export class InvalidPhoneError extends DomainError {
    constructor(phone: string) {
        super(`Telefone inválido: "${phone}"`)
    }
}
