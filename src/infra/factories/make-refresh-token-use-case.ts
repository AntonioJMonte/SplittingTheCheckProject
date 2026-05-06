import { RefreshTokenUseCase } from '../../application/use-cases/auth/refresh-token-use-case'
import { PrismaUserRepository } from '../database/prisma/prismaUserRepository'

export function makeRefreshTokenUseCase() {
    const userRepository = new PrismaUserRepository()
    return new RefreshTokenUseCase(userRepository)
}
