import { User } from '../../../domain/entities/user'
import { InvalidCredentialsError } from '../../../shared/errors/invalid-credentials-error'
import { UserRepository } from '../../repositories/users-repository'
import { RefreshTokenRevoker } from '../../services/refresh-token-revoker'

interface RefreshTokenUseCaseRequest {
    userId: string
    token: string
}

interface RefreshTokenUseCaseResponse {
    user: User
}

export class RefreshTokenUseCase {

    constructor(
        private userRepository: UserRepository,
        private refreshTokenRevoker: RefreshTokenRevoker,
    ) {}

    async execute({ userId, token }: RefreshTokenUseCaseRequest): Promise<RefreshTokenUseCaseResponse> {
        if (await this.refreshTokenRevoker.isRevoked(token)) {
            throw new InvalidCredentialsError()
        }

        const user = await this.userRepository.findById(userId)
        if (!user) {
            throw new InvalidCredentialsError()
        }
        return { user }
    }
}
