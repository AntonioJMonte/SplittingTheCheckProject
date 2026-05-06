import { User } from '../../../domain/entities/user'
import { InvalidCredentialsError } from '../../../shared/errors/invalid-credentials-error'
import { UserRepository } from '../../repositories/user-repository'

interface RefreshTokenUseCaseRequest {
    userId: string
}

interface RefreshTokenUseCaseResponse {
    user: User
}

export class RefreshTokenUseCase {
    constructor(private userRepository: UserRepository) {}

    async execute({ userId }: RefreshTokenUseCaseRequest): Promise<RefreshTokenUseCaseResponse> {
        const user = await this.userRepository.findById(userId)
        if (!user) {
            throw new InvalidCredentialsError()
        }
        return { user }
    }
}
