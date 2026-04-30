import { RegisterUserUseCase } from "../../application/use-cases/auth/register-use-case";
import { PrismaUserRepository } from "../../infra/database/prisma/prismaUserRepository";


export function makeRegisterUseCase () {
    const prismaUserRepository = new PrismaUserRepository()
    const registerUseCase = new RegisterUserUseCase(prismaUserRepository)

    return registerUseCase
}