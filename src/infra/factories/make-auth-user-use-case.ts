import { AuthUserUseCase } from "../../application/use-cases/auth/authenticate-user-use-case";
import { PrismaUserRepository } from "../../infra/database/prisma/prismaUserRepository";


export function makeAuthUserUseCase () {
    const prismaUserRepository = new PrismaUserRepository()
    const authUseCase = new AuthUserUseCase(prismaUserRepository)

    return authUseCase
}