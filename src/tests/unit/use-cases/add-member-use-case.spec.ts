import { describe, it, expect, beforeEach } from 'vitest'
import { AddMemberUseCase } from '../../../application/use-cases/groups/add-member-use-case'
import { InMemoryGroupRepository } from '../../doubles/in-memory-group-repository'
import { InMemoryMemberRepository } from '../../doubles/in-memory-member-repository'
import { InMemoryUserRepository } from '../../doubles/in-memory-user-repository'
import { Group } from '../../../domain/entities/group'
import { Member } from '../../../domain/entities/member'
import { User } from '../../../domain/entities/user'
import { GroupNotFoundError } from '../../../shared/errors/group-not-found-error'
import { AppError } from '../../../shared/errors/app-error'
import { DomainError } from '../../../shared/errors/domain-error'

describe('AddMemberUseCase', () => {
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

  async function makeGroupWithOwner(ownerUserId = 'owner-1') {
    const group = Group.create({ name: 'Grupo', creatorUserId: ownerUserId, currency: 'BRL' })
    const owner = group.members[0] as Member
    await groupRepository.create(group)
    await memberRepository.addMemberToGroup(owner)
    return { group, owner }
  }

  async function registerInvitee(props: { email: string; phone?: string }) {
    const user = User.create({
      name: 'Convidado',
      email: props.email,
      passwordHash: 'hash',
      phone: props.phone,
    })
    await userRepository.create(user)
    return user
  }

  it('adiciona pelo email quando quem pede é o dono', async () => {
    const { group, owner } = await makeGroupWithOwner()
    const convidado = await registerInvitee({ email: 'bruno@example.com' })

    const { newMember } = await sut.execute({
      groupId: group.id,
      requestedByUserId: owner.userId,
      invitee: { email: 'bruno@example.com' },
    })

    expect(newMember.userId).toBe(convidado.id)
    expect(newMember.groupId).toBe(group.id)
    expect(newMember.isOwner()).toBe(false)
  })

  it('adiciona pelo telefone, casando grafias diferentes do mesmo número (D-76)', async () => {
    const { group, owner } = await makeGroupWithOwner()
    const convidado = await registerInvitee({ email: 'bruno@example.com', phone: '+5511987654321' })

    const { newMember } = await sut.execute({
      groupId: group.id,
      requestedByUserId: owner.userId,
      invitee: { phone: '(11) 98765-4321' },
    })

    expect(newMember.userId).toBe(convidado.id)
  })

  it('encontra o convidado mesmo com o email em outra caixa', async () => {
    const { group, owner } = await makeGroupWithOwner()
    const convidado = await registerInvitee({ email: 'bruno@example.com' })

    const { newMember } = await sut.execute({
      groupId: group.id,
      requestedByUserId: owner.userId,
      invitee: { email: '  BRUNO@example.com  ' },
    })

    expect(newMember.userId).toBe(convidado.id)
  })

  it('recusa com 404 quando ninguém está registrado com aquele contato', async () => {
    const { group, owner } = await makeGroupWithOwner()

    await expect(
      sut.execute({
        groupId: group.id,
        requestedByUserId: owner.userId,
        invitee: { email: 'ninguem@example.com' },
      }),
    ).rejects.toMatchObject({ statusCode: 404 })
  })

  it('recusa com 404 quando o telefone não pertence a ninguém', async () => {
    const { group, owner } = await makeGroupWithOwner()
    await registerInvitee({ email: 'bruno@example.com' })

    await expect(
      sut.execute({
        groupId: group.id,
        requestedByUserId: owner.userId,
        invitee: { phone: '11999998888' },
      }),
    ).rejects.toMatchObject({ statusCode: 404 })
  })

  it('não consulta o banco de usuários antes de validar o grupo', async () => {
    await expect(
      sut.execute({
        groupId: 'nonexistent',
        requestedByUserId: 'user-1',
        invitee: { email: 'bruno@example.com' },
      }),
    ).rejects.toBeInstanceOf(GroupNotFoundError)
  })

  it('recusa quem não é membro do grupo', async () => {
    const { group } = await makeGroupWithOwner()
    await registerInvitee({ email: 'bruno@example.com' })

    await expect(
      sut.execute({
        groupId: group.id,
        requestedByUserId: 'stranger',
        invitee: { email: 'bruno@example.com' },
      }),
    ).rejects.toBeInstanceOf(AppError)
  })

  it('recusa membro comum que tenta convidar', async () => {
    const { group } = await makeGroupWithOwner('owner-1')
    const regularMember = Member.create({ userId: 'member-1', groupId: group.id })
    await memberRepository.addMemberToGroup(regularMember)
    await registerInvitee({ email: 'bruno@example.com' })

    await expect(
      sut.execute({
        groupId: group.id,
        requestedByUserId: 'member-1',
        invitee: { email: 'bruno@example.com' },
      }),
    ).rejects.toBeInstanceOf(DomainError)
  })

  it('recusa quem já é membro do grupo', async () => {
    const { group, owner } = await makeGroupWithOwner()
    const jaMembro = await registerInvitee({ email: 'dono@example.com' })
    // O dono já está no grupo; convidá-lo de novo tem de falhar.
    await memberRepository.addMemberToGroup(Member.create({ userId: jaMembro.id, groupId: group.id }))
    group.addMember(owner, jaMembro.id)

    await expect(
      sut.execute({
        groupId: group.id,
        requestedByUserId: owner.userId,
        invitee: { email: 'dono@example.com' },
      }),
    ).rejects.toBeInstanceOf(DomainError)
  })
})
