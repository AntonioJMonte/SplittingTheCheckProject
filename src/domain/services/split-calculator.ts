import Decimal from 'decimal.js'
import { DomainError } from '../../shared/errors/domain-error'
import { Money } from '../value-objects/money'

export interface SplitShare {
    memberId: string
    amount: Money
}

const CENT = new Decimal('0.01')

// Divide `total` entre `memberIds` e devolve as partes com soma exatamente igual ao total.
// Arredondar cada parte isoladamente perde ou cria centavos (100/3 = 33,33 × 3 = 99,99), e a
// entidade Expense rejeita partes que não somam o total. Por isso o resto é distribuído em
// centavos entre as primeiras partes, mantendo a ordem recebida — estável e determinístico.
function distribute(total: Money, memberIds: string[], rawShares: Decimal[]): SplitShare[] {
    const rounded = rawShares.map(value => value.toDecimalPlaces(2, Decimal.ROUND_DOWN))
    const distributed = rounded.reduce((acc, value) => acc.plus(value), new Decimal(0))
    let remainder = total.toDecimal().minus(distributed)

    const amounts = rounded.map(value => {
        if (remainder.greaterThanOrEqualTo(CENT)) {
            remainder = remainder.minus(CENT)
            return value.plus(CENT)
        }
        return value
    })

    return memberIds.map((memberId, index) => ({ memberId, amount: new Money(amounts[index]) }))
}

export class SplitCalculator {

    static equally(total: Money, memberIds: string[]): SplitShare[] {
        if (memberIds.length === 0) {
            throw new DomainError('A despesa deve ter ao menos uma parte')
        }

        const each = total.toDecimal().dividedBy(memberIds.length)
        return distribute(total, memberIds, memberIds.map(() => each))
    }

    static byPercentage(total: Money, shares: Array<{ memberId: string; percentage: number }>): SplitShare[] {
        if (shares.length === 0) {
            throw new DomainError('A despesa deve ter ao menos uma parte')
        }

        const sum = shares.reduce((acc, share) => acc.plus(new Decimal(share.percentage)), new Decimal(0))
        if (!sum.equals(100)) {
            throw new DomainError('A soma dos percentuais deve ser 100')
        }

        const raw = shares.map(share => total.toDecimal().times(share.percentage).dividedBy(100))
        return distribute(total, shares.map(s => s.memberId), raw)
    }
}
