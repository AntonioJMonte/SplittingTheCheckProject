import { InvalidPhoneError } from '../errors/invalid-phone-error'

// D-76: o número é guardado em E.164 (+5511987654321). Sem forma canônica o `@unique` não
// protege nada e a busca por telefone erra — "(11) 98765-4321" e "11987654321" são o mesmo
// número. Na ausência de DDI assume-se +55, coerente com um produto brasileiro.
export class Phone {
    private readonly _value: string

    private static readonly BRAZIL_CODE = '55'
    // Sem DDI: 10 dígitos (fixo com DDD) ou 11 (celular com DDD e o nono dígito).
    private static readonly LOCAL_LENGTHS = [10, 11]
    // E.164 permite no máximo 15 dígitos; abaixo de 8 não existe número discável.
    private static readonly MIN_DIGITS = 8
    private static readonly MAX_DIGITS = 15

    constructor(phone: string) {
        this._value = Phone.normalize(phone)
    }

    private static normalize(phone: string): string {
        const trimmed = phone.trim()
        const digits = trimmed.replace(/\D/g, '')

        if (digits.length === 0) {
            throw new InvalidPhoneError(phone)
        }

        // Já veio internacional: respeita o DDI informado.
        if (trimmed.startsWith('+')) {
            return Phone.withinE164(digits, phone)
        }

        if (Phone.LOCAL_LENGTHS.includes(digits.length)) {
            return Phone.withinE164(`${Phone.BRAZIL_CODE}${digits}`, phone)
        }

        // 12 ou 13 dígitos começando com 55 é um número brasileiro digitado sem o "+".
        if (digits.startsWith(Phone.BRAZIL_CODE) && Phone.LOCAL_LENGTHS.includes(digits.length - 2)) {
            return Phone.withinE164(digits, phone)
        }

        throw new InvalidPhoneError(phone)
    }

    private static withinE164(digits: string, original: string): string {
        if (digits.length < Phone.MIN_DIGITS || digits.length > Phone.MAX_DIGITS) {
            throw new InvalidPhoneError(original)
        }
        return `+${digits}`
    }

    get value(): string {
        return this._value
    }

    equals(other: Phone): boolean {
        return this._value === other._value
    }

    toString(): string {
        return this._value
    }
}
