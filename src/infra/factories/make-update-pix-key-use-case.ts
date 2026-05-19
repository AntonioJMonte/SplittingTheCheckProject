import { UpdatePixKeyUseCase } from '../../application/use-cases/users/update-pix-key-use-case'
import { PrismaUserRepository } from '../database/prisma/prismaUserRepository'

export function makeUpdatePixKeyUseCase() {
    const userRepository = new PrismaUserRepository()
    return new UpdatePixKeyUseCase(userRepository)
}
