import { DomainError } from "../../shared/errors/domain-error";
import { Email } from "../value-objects/email";


export class User {

    constructor (
        public readonly id: string,
        public readonly name: string,
        public readonly email: Email,
        public readonly passwordHash: string,
        public readonly pixKey?: string
    ) {}

    
    static create(prop: { name: string, email: string, passwordHash: string}) {

        // the name field cant be empty
        if (!prop.name.trim()) {
            throw new DomainError('The name field cant be empty')
        }

        return new User (
            crypto.randomUUID(),
            prop.name,
            new Email(prop.email),
            prop.passwordHash,
        )
    }

}