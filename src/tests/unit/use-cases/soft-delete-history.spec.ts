import { describe, it, expect, beforeEach } from 'vitest'
import { AddMemberUseCase } from '../../../application/use-cases/groups/add-member-use-case'
import { InMemoryGroupRepository } from '../../doubles/in-memory-group-repository'
import { InMemoryMemberRepository } from '../../doubles/in-memory-member-repository'
import { InMemoryUserRepository } from '../../doubles/in-memory-user-repository'
import { InMemoryExpenseRepository } from '../../doubles/in-memory-expense-repository'
import { Group } from '../../../domain/entities/group'
import { Member } from '../../../domain/entities/member'
import { User } from '../../../domain/entities/user'
import { Expense } from '../../../domain/entities/expense'
import { Money } from '../../../domain/value-objects/money'

describe('Histórico preservado por soft delete (D-72/D-73/D-79)', () => {
    let memberRepository: InMemoryMemberRepository
    let expenseRepository: InMemoryExpenseRepository

    beforeEach(() => {
        memberRepository = new InMemoryMemberRepository()
        expenseRepository = new InMemoryExpenseRepository()
    })

    it('um membro removido continua encontrável por id, para as despesas antigas terem autor', async () => {
        const member = Member.create({ userId: 'user-1', groupId: 'group-1' })
        await memberRepository.addMemberToGroup(member)

        await memberRepository.removeMemberGroup(member.id, 'owner-1')

        // Sai das leituras ativas...
        expect(await memberRepository.findByUserAndGroup('user-1', 'group-1')).toBeNull()
        expect(await memberRepository.findByGroupId('group-1')).toHaveLength(0)
        // ...mas continua resolvível por id, que é o que mantém o histórico legível (D-79).
        expect(await memberRepository.findById(member.id)).not.toBeNull()
    })

    it('registra quem removeu, não apenas que foi removido', async () => {
        const member = Member.create({ userId: 'user-1', groupId: 'group-1' })
        await memberRepository.addMemberToGroup(member)

        await memberRepository.removeMemberGroup(member.id, 'owner-1')

        expect(memberRepository.removed.get(member.id)).toEqual({ deletedBy: 'owner-1' })
    })

    it('a despesa excluída some das listagens mas permanece armazenada', async () => {
        const expense = Expense.create({
            groupId: 'group-1',
            payerId: 'user-1',
            description: 'Jantar',
            amount: new Money('90.00'),
            splitMethod: 'EQUAL',
            shareInputs: [{ memberId: 'member-1', amount: new Money('90.00') }],
        })
        await expenseRepository.create(expense)

        await expenseRepository.softDelete(expense.id, 'user-1')

        expect(await expenseRepository.findById(expense.id)).toBeNull()
        expect(await expenseRepository.findByGroupId('group-1')).toHaveLength(0)
        expect(expenseRepository.items).toHaveLength(1)
        expect(expenseRepository.deleted.get(expense.id)).toEqual({ deletedBy: 'user-1' })
    })

    it('uma despesa excluída não volta pela listagem paginada', async () => {
        const expense = Expense.create({
            groupId: 'group-1',
            payerId: 'user-1',
            description: 'Jantar',
            amount: new Money('90.00'),
            splitMethod: 'EQUAL',
            shareInputs: [{ memberId: 'member-1', amount: new Money('90.00') }],
        })
        await expenseRepository.create(expense)
        await expenseRepository.softDelete(expense.id, 'user-1')

        const { expenses, total } = await expenseRepository.findManyByGroup({
            groupId: 'group-1',
            userId: 'user-1',
        })

        expect(expenses).toHaveLength(0)
        expect(total).toBe(0)
    })

    it('uma despesa excluída não é recategorizada', async () => {
        const expense = Expense.create({
            groupId: 'group-1',
            payerId: 'user-1',
            description: 'Jantar',
            amount: new Money('90.00'),
            splitMethod: 'EQUAL',
            shareInputs: [{ memberId: 'member-1', amount: new Money('90.00') }],
        })
        await expenseRepository.create(expense)
        await expenseRepository.softDelete(expense.id, 'user-1')

        const escreveu = await expenseRepository.updateCategory(expense.id, 'Alimentação', 'Jantar')

        expect(escreveu).toBe(false)
    })
})

describe('Reativação de quem volta ao grupo (D-78)', () => {
    let groupRepository: InMemoryGroupRepository
    let memberRepository: InMemoryMemberRepository
    let userRepository: InMemoryUserRepository
    let sut: AddMemberUseCase

    beforeEach(() => {
        groupRepository = new InMemoryGroupRepository()
        memberRepository = new InMemoryMemberRepository()
        userRepository = new InMemoryUserRepository()
        sut = new AddMemberUseCase(groupRepository, memberRepository, userRepository)
    })

    it('readicionar quem saiu reaproveita o registro, preservando o id do membro', async () => {
        const group = Group.create({ name: 'Grupo', creatorUserId: 'owner-1', currency: 'BRL' })
        const owner = group.members[0] as Member
        await groupRepository.create(group)
        await memberRepository.addMemberToGroup(owner)

        const bob = User.create({ name: 'Bob', email: 'bob@example.com', passwordHash: 'hash' })
        await userRepository.create(bob)

        const primeiro = await sut.execute({
            groupId: group.id,
            requestedByUserId: owner.userId,
            invitee: { email: 'bob@example.com' },
        })
        const memberIdOriginal = primeiro.newMember.id

        // Replica o que RemoveMemberUseCase faz: tira do agregado e marca no repositório.
        group.removeMember(owner, bob.id)
        await memberRepository.removeMemberGroup(memberIdOriginal, owner.userId)
        expect(await memberRepository.findByUserAndGroup(bob.id, group.id)).toBeNull()

        const segundo = await sut.execute({
            groupId: group.id,
            requestedByUserId: owner.userId,
            invitee: { email: 'bob@example.com' },
        })

        // Mesmo id: os ExpenseShare antigos continuam apontando para este membro (D-78).
        expect(segundo.newMember.id).toBe(memberIdOriginal)
        expect(await memberRepository.findByUserAndGroup(bob.id, group.id)).not.toBeNull()
        expect(memberRepository.items.filter(m => m.userId === bob.id && m.groupId === group.id)).toHaveLength(1)
    })
})
