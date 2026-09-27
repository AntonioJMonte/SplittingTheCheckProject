import { UserRepository } from '../../repositories/users-repository'
import { Phone } from '../../../domain/value-objects/phone'
import { AppError } from '../../../shared/errors/app-error'
import { PhoneAlreadyInUseError } from '../../../shared/errors/phone-already-in-use-error'

interface UpdatePhoneUseCaseRequest {
    userId: string
    phone: string | null
}

export class UpdatePhoneUseCase {

    constructor(private userRepository: UserRepository) {}

    async execute({ userId, phone }: UpdatePhoneUseCaseRequest): Promise<void> {
        const user = await this.userRepository.findById(userId)
        if (!user) {
            throw new AppError('Usuário não encontrado', 404)
        }

        if (phone === null) {
            await this.userRepository.updatePhone(userId, null)
            return
        }

        const normalized = new Phone(phone).value
        const owner = await this.userRepository.findByPhone(normalized)
        // Reenviar o próprio número é idempotente; só o número de outra conta é conflito.
        if (owner && owner.id !== userId) {
            throw new PhoneAlreadyInUseError()
        }

        await this.userRepository.updatePhone(userId, normalized)
    }
}
