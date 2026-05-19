import { Prisma } from '@prisma/client'
import { prisma } from './prismaClient'
import { ExpenseRepository, FindManyByGroupParams, FindManyByGroupResult } from '../../../application/repositories/expense-repository'
import { Expense } from '../../../domain/entities/expense'
import { ExpenseShare } from '../../../domain/entities/expense-share'
import { Money } from '../../../domain/value-objects/money'
import { SplitMethodType } from '../../../domain/value-objects/split-method'

function toExpense(row: {
    id: string
    groupId: string
    payerId: string
    description: string
    amount: { toString(): string }
    splitMethod: string
    occurredAt: Date
    category: string | null
    shares: Array<{ id: string; expenseId: string; memberId: string; amount: { toString(): string } }>
}): Expense {
    return new Expense(
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
    )
}

function buildWhereClause(params: FindManyByGroupParams): Prisma.ExpenseWhereInput {
    const where: Prisma.ExpenseWhereInput = { groupId: params.groupId }

    if (params.category !== undefined) {
        where.category = params.category
    }

    if (params.startDate !== undefined || params.endDate !== undefined) {
        where.occurredAt = {
            gte: params.startDate,
            lte: params.endDate,
        }
    }

    if (params.minAmount !== undefined || params.maxAmount !== undefined) {
        where.amount = {
            gte: params.minAmount?.toString(),
            lte: params.maxAmount?.toString(),
        }
    }

    if (params.view === 'involved') {
        where.shares = { some: { member: { userId: params.userId } } }
    } else if (params.view === 'paid') {
        where.payerId = params.userId
    } else if (params.view === 'pending') {
        where.payerId = { not: params.userId }
        where.shares = { some: { member: { userId: params.userId } } }
        where.group = {
            settlements: {
                none: {
                    status: 'CONFIRMED',
                    fromMember: { userId: params.userId },
                },
            },
        }
    }

    return where
}

export class PrismaExpenseRepository implements ExpenseRepository {

    async create(data: Expense): Promise<void> {
        await prisma.$transaction(async tx => {
            await tx.expense.create({
                data: {
                    id: data.id,
                    groupId: data.groupId,
                    payerId: data.payerId,
                    description: data.description,
                    amount: data.amount.toString(),
                    splitMethod: data.splitMethod,
                    occurredAt: data.occurredAt,
                    category: data.category,
                },
            })
            for (const share of data.shares) {
                await tx.expenseShare.create({
                    data: {
                        id: share.id,
                        expenseId: share.expenseId,
                        memberId: share.memberId,
                        amount: share.amount.toString(),
                    },
                })
            }
        })
    }

    async findById(id: string): Promise<Expense | null> {
        const row = await prisma.expense.findUnique({
            where: { id },
            include: { shares: true },
        })
        if (!row) return null
        return toExpense(row)
    }

    async findByGroupId(groupId: string): Promise<Expense[]> {
        const rows = await prisma.expense.findMany({
            where: { groupId },
            include: { shares: true },
        })
        return rows.map(toExpense)
    }

    async findManyByGroup(params: FindManyByGroupParams): Promise<FindManyByGroupResult> {
        const page = params.page ?? 1
        const limit = params.limit ?? 20
        const skip = (page - 1) * limit
        const where = buildWhereClause(params)

        const [rows, total] = await Promise.all([
            prisma.expense.findMany({
                where,
                include: { shares: true },
                orderBy: { occurredAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.expense.count({ where }),
        ])

        return { expenses: rows.map(toExpense), total }
    }

    async update(data: Expense): Promise<void> {
        await prisma.$transaction(async tx => {
            await tx.expense.update({
                where: { id: data.id },
                data: {
                    description: data.description,
                    amount: data.amount.toString(),
                    splitMethod: data.splitMethod,
                },
            })
            await tx.expenseShare.deleteMany({ where: { expenseId: data.id } })
            for (const share of data.shares) {
                await tx.expenseShare.create({
                    data: {
                        id: share.id,
                        expenseId: share.expenseId,
                        memberId: share.memberId,
                        amount: share.amount.toString(),
                    },
                })
            }
        })
    }

    async delete(id: string): Promise<void> {
        await prisma.expense.delete({ where: { id } })
    }
}
