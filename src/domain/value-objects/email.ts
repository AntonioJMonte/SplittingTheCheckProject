import { InvalidEmailError } from '../errors/invalid-email-error'

export class Email {
    private readonly _value: string

    private static readonly REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/

    constructor(email: string) {
        const normalized = email.trim().toLowerCase()
        if (!Email.REGEX.test(normalized)) {
            throw new InvalidEmailError(email)
        }
        this._value = normalized
    }

    get value(): string {
        return this._value
    }

    equals(other: Email): boolean {
        return this._value === other._value
    }

    toString(): string {
        return this._value
    }
}
