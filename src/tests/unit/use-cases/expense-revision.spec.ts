import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryExpenseRepository } from '../../doubles/in-memory-expense-repository'
import { Expense } from '../../../domain/entities/expense'
import { Money } from '../../../domain/value-objects/money'

function makeExpense(description = 'Jantar', amount = '90.00') {
    return Expense.create({
        groupId: 'group-1',
        payerId: 'user-1',
        description,
        amount: new Money(amount),
        splitMethod: 'EQUAL',
        shareInputs: [{ memberId: 'member-1', amount: new Money(amount) }],
    })
}

describe('Trilha de auditoria de edições (D-80/D-81)', () => {
    let repository: InMemoryExpenseRepository

    beforeEach(() => {
        repository = new InMemoryExpenseRepository()
    })

    it('guarda o estado anterior, não o novo, a cada edição', async () => {
        const original = makeExpense('Jantar', '90.00')
        await repository.create(original)

        const editada = original.update({ description: 'Jantar japonês', amount: new Money('30.00'), shareInputs: [{ memberId: 'member-1', amount: new Money('30.00') }] })
        await repository.updateWithRevision(editada, original, 'user-1')

        expect(repository.revisions).toHaveLength(1)
        // A pergunta que a auditoria responde é "quanto era antes?".
        expect(repository.revisions[0]).toMatchObject({
            expenseId: original.id,
            description: 'Jantar',
            amount: '90.00',
            editedBy: 'user-1',
        })
    })

    it('registra quem editou, que pode não ser quem pagou', async () => {
        const original = makeExpense()
        await repository.create(original)

        const editada = original.update({ description: 'Corrigido pelo dono' })
        await repository.updateWithRevision(editada, original, 'owner-9')

        expect(repository.revisions[0]).toMatchObject({ editedBy: 'owner-9' })
    })

    it('guarda o snapshot completo, incluindo as partes (D-81)', async () => {
        const original = makeExpense()
        await repository.create(original)

        const editada = original.update({ description: 'Outro' })
        await repository.updateWithRevision(editada, original, 'user-1')

        expect(repository.revisions[0].shares).toEqual([{ memberId: 'member-1', amount: '90.00' }])
        expect(repository.revisions[0].splitMethod).toBe('EQUAL')
        expect(repository.revisions[0].occurredAt).toEqual(original.occurredAt)
    })

    it('acumula uma revisão por edição, em ordem', async () => {
        const v0 = makeExpense('Primeira')
        await repository.create(v0)

        const v1 = v0.update({ description: 'Segunda' })
        await repository.updateWithRevision(v1, v0, 'user-1')

        const atual = await repository.findById(v0.id)
        const v2 = atual!.update({ description: 'Terceira' })
        await repository.updateWithRevision(v2, atual!, 'user-1')

        expect(repository.revisions.map(r => r.description)).toEqual(['Primeira', 'Segunda'])
        expect(repository.revisions.map(r => r.version)).toEqual([0, 1])
    })
})

describe('Lock otimista em despesa (D-82)', () => {
    let repository: InMemoryExpenseRepository

    beforeEach(() => {
        repository = new InMemoryExpenseRepository()
    })

    it('incrementa a versão a cada gravação bem-sucedida', async () => {
        const original = makeExpense()
        await repository.create(original)
        expect(original.version).toBe(0)

        await repository.updateWithRevision(original.update({ description: 'Nova' }), original, 'user-1')

        const atual = await repository.findById(original.id)
        expect(atual!.version).toBe(1)
    })

    it('recusa a segunda escrita de duas edições concorrentes', async () => {
        const original = makeExpense()
        await repository.create(original)

        // Dois clientes leem a mesma versão 0.
        const edicaoA = original.update({ description: 'Versão do A' })
        const edicaoB = original.update({ description: 'Versão do B' })

        const primeira = await repository.updateWithRevision(edicaoA, original, 'user-a')
        const segunda = await repository.updateWithRevision(edicaoB, original, 'user-b')

        expect(primeira).toBe(true)
        expect(segunda).toBe(false)

        const atual = await repository.findById(original.id)
        expect(atual!.description).toBe('Versão do A')
    })

    it('em conflito não grava nem a revisão — o histórico não registra o que não aconteceu', async () => {
        const original = makeExpense()
        await repository.create(original)

        await repository.updateWithRevision(original.update({ description: 'A' }), original, 'user-a')
        await repository.updateWithRevision(original.update({ description: 'B' }), original, 'user-b')

        expect(repository.revisions).toHaveLength(1)
        expect(repository.revisions[0]).toMatchObject({ editedBy: 'user-a' })
    })

    it('recusa a edição de uma despesa já excluída', async () => {
        const original = makeExpense()
        await repository.create(original)
        await repository.softDelete(original.id, 'user-1')

        const gravou = await repository.updateWithRevision(original.update({ description: 'Nova' }), original, 'user-1')

        expect(gravou).toBe(false)
        expect(repository.revisions).toHaveLength(0)
    })
})
