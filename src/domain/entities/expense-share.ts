import { randomUUID } from 'node:crypto';
import { Money } from '../value-objects/money'

export class ExpenseShare {
    constructor(
        public readonly id: string,
        public readonly expenseId: string,
        public readonly memberId: string,
        public readonly amount: Money,
    ) {}

    static create(props: { expenseId: string; memberId: string; amount: Money }) {
        return new ExpenseShare(
            randomUUID(),
            props.expenseId,
            props.memberId,
            props.amount,
        )
    }
}