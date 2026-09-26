import { User } from '../../domain/entities/user'

let sequence = 0

export function makeUser(overrides: Partial<{ name: string; email: string; passwordHash: string }> = {}): User {
    sequence++
    return User.create({
        name: overrides.name ?? `Usuário ${sequence}`,
        email: overrides.email ?? `usuario${sequence}@example.com`,
        passwordHash: overrides.passwordHash ?? 'hash-de-teste',
    })
}
