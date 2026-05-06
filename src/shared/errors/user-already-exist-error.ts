import { DomainError } from "./domain-error";


export class UserAlreadyExistError extends DomainError {
    constructor () {
        super('User With Email Already Exist')
    }

}