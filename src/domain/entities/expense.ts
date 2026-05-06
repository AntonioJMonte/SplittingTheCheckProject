import { randomUUID } from 'node:crypto'
import { DomainError } from '../../shared/errors/domain-error'
import { Money } from '../value-objects/money'
import { SplitMethodType } from '../value-objects/split-method'
import { ExpenseShare } from './expense-share'

interface ShareInput {
    memberId: string
    amount: Money
}

export class Expense {
    constructor(
        public readonly id: string,
        public readonly groupId: string,
        public readonly payerId: string,
        public readonly description: string,
        public readonly amount: Money,
        public readonly shares: ReadonlyArray<ExpenseShare>,
        public readonly splitMethod: SplitMethodType,
        public readonly occurredAt: Date,
        public readonly category?: string,
    ) {}

    static create(props: {
        groupId: string
        payerId: string
        description: string
        amount: Money
        shareInputs: ShareInput[]
        splitMethod: SplitMethodType
        occurredAt?: Date
        category?: string
    }) {
        if (!props.description.trim()) {
            throw new DomainError('A descrição da despesa não pode ser vazia')
        }

        if (props.shareInputs.length === 0) {
            throw new DomainError('A despesa deve ter ao menos uma parte')
        }

        const id = randomUUID()
        const shares = props.shareInputs.map(s =>
            ExpenseShare.create({ expenseId: id, memberId: s.memberId, amount: s.amount }),
        )

        const sharesTotal = shares.reduce((acc, s) => acc.add(s.amount), new Money(0))
        if (!sharesTotal.equals(props.amount)) {
            throw new DomainError('A soma das partes não corresponde ao valor total da despesa')
        }

        return new Expense(
            id,
            props.groupId,
            props.payerId,
            props.description.trim(),
            props.amount,
            shares,
            props.splitMethod,
            props.occurredAt ?? new Date(),
            props.category,
        )
    }
}