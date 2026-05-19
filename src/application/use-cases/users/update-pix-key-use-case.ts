import { UserRepository } from '../../repositories/users-repository'
import { AppError } from '../../../shared/errors/app-error'

interface UpdatePixKeyUseCaseRequest {
    userId: string
    pixKey: string | null
}

export class UpdatePixKeyUseCase {

    constructor(private userRepository: UserRepository) {}

    async execute({ userId, pixKey }: UpdatePixKeyUseCaseRequest): Promise<void> {
        const user = await this.userRepository.findById(userId)
        if (!user) {
            throw new AppError('Usuário não encontrado', 404)
        }
        await this.userRepository.updatePixKey(userId, pixKey)
    }
}
