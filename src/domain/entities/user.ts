import { randomUUID } from "node:crypto";
import { DomainError } from "../../shared/errors/domain-error";
import { Email } from "../value-objects/email";
import { Phone } from "../value-objects/phone";


export class User {

    constructor (
        public readonly id: string,
        public readonly name: string,
        public readonly email: Email,
        public readonly passwordHash: string,
        public readonly pixKey?: string,
        public readonly phone?: Phone,
    ) {}

    static create(props: { name: string; email: string; passwordHash: string; phone?: string }) {
        if (!props.name.trim()) {
            throw new DomainError('O nome não pode ser vazio')
        }

        return new User(
            randomUUID(),
            props.name.trim(),
            new Email(props.email),
            props.passwordHash,
            undefined,
            props.phone ? new Phone(props.phone) : undefined,
        )
    }

    withPhone(phone: string | null): User {
        return new User(
            this.id,
            this.name,
            this.email,
            this.passwordHash,
            this.pixKey,
            phone ? new Phone(phone) : undefined,
        )
    }

}
