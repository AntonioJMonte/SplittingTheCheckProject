import Decimal from 'decimal.js'
import { DomainError } from '../../shared/errors/domain-error'

export class Money {

    private readonly value: Decimal

    constructor (amount: number | string | Decimal) {
        const decimal = new Decimal(amount)
        if (decimal.isNegative()) {
            throw new DomainError('O valor monetário não pode ser negativo')
        }
        this.value = decimal.toDecimalPlaces(2)
    }
    
    add (other: Money): Money {
        return new Money(this.value.plus(other.value))
    }

    subtract (other: Money): Money {
        return new Money(this.value.sub(other.value))
    }

    divide (other: Money): Money {
        return new Money(this.value.dividedBy(other.value).toDecimalPlaces(2))
    }

    equals (other: Money): Boolean {
        return this.value.equals(other.value)
    }

    isGreaterThan (other: Money): Boolean {
        return this.value.greaterThan(other.value)
    }

    toNumber(): number {
        return this.value.toNumber()
    }

    toString(): string {
        return this.value.toFixed(2)
    }

    toDecimal(): Decimal {
        return this.value
    }

}