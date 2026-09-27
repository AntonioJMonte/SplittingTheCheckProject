import { User } from '../../domain/entities/user'

export interface UserRepository {
    create(data: User): Promise<void>
    findByEmail(email: string): Promise<User | null>
    /** Recebe o telefone já normalizado em E.164 pelo VO Phone (D-76). */
    findByPhone(phone: string): Promise<User | null>
    findById(id: string): Promise<User | null>
    updatePixKey(userId: string, pixKey: string | null): Promise<void>
    updatePhone(userId: string, phone: string | null): Promise<void>
}