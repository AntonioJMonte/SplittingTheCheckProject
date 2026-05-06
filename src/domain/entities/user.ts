import { randomUUID } from "node:crypto";
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

    static create(props: { name: string; email: string; passwordHash: string }) {
        if (!props.name.trim()) {
            throw new DomainError('O nome não pode ser vazio')
        }

        return new User(
            randomUUID(),
            props.name.trim(),
            new Email(props.email),
            props.passwordHash,
        )
    }

}