import { RegisterUserUseCase } from "../../application/use-cases/auth/register-use-case";
import { PrismaUserRepository } from "../../infra/database/prisma/prismaUserRepository";
import { env } from "../env";

// D-85: com o custo de produção (12, D-69) cada registro leva ~250 ms, e os e2e registram dezenas
// de usuários em paralelo — o bastante para estourar o timeout. 4 é o mínimo do bcrypt.
const TEST_BCRYPT_ROUNDS = 4

export function makeRegisterUseCase () {
    const prismaUserRepository = new PrismaUserRepository()
    const bcryptRounds = env.NODE_ENV === 'test' ? TEST_BCRYPT_ROUNDS : undefined
    const registerUseCase = new RegisterUserUseCase(prismaUserRepository, bcryptRounds)

    return registerUseCase
}
