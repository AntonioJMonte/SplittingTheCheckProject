
// in this class i need to ensure that emails have a correct format
export class Email {

    private readonly value: string

    private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    constructor(email: string) {
        if (!Email.EMAIL_REGEX.test(email)) {
            throw new Error ('Invalid Email')
        }
        this.value = email.toLowerCase()
    }
    
    toString(): string {
        return this.value
    }

    equals(other: Email): boolean {
        return this.value === other.value
    }
}