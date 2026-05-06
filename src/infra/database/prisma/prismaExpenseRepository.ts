import { prisma } from './prismaClient'
import { ExpenseRepository } from '../../../application/repositories/expense-repository'
import { Expense } from '../../../domain/entities/expense'
import { ExpenseShare } from '../../../domain/entities/expense-share'
import { Money } from '../../../domain/value-objects/money'
import { SplitMethodType } from '../../../domain/value-objects/split-method'

export class PrismaExpenseRepository implements ExpenseRepository {

    async findByGroupId(groupId: string): Promise<Expense[]> {
        const rows = await prisma.expense.findMany({
            where: { groupId },
            include: { shares: true },
        })

        return rows.map(row =>
            new Expense(
                row.id,
                row.groupId,
                row.payerId,
                row.description,
                new Money(row.amount.toString()),
                row.shares.map(s =>
                    new ExpenseShare(s.id, s.expenseId, s.memberId, new Money(s.amount.toString())),
                ),
                row.splitMethod as SplitMethodType,
                row.occurredAt,
                row.category ?? undefined,
            ),
        )
    }
}
