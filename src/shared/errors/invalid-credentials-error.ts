import { DomainError } from "./domain-error";


export class InvalidCredentialsError extends DomainError {
    constructor () {
        super('Email or Password incorrect')
    }

}