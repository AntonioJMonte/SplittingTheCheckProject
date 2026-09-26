import { hash } from "bcryptjs";
import { User } from "../../../domain/entities/user";
import { UserAlreadyExistError } from "../../../shared/errors/user-already-exist-error";
import { UserRepository } from "../../repositories/users-repository";

// D-69: 6 rounds deixavam o hash ~16x mais barato de quebrar offline. O custo fica em torno
// de 250ms, irrelevante em uma rota que roda uma vez por conta. Hashes antigos seguem válidos:
// o bcrypt grava o custo dentro do próprio hash.
const BCRYPT_ROUNDS = 12

interface RegisterUseCaseRequest {
    name: string
    email: string
    password: string
}

interface RegisterUseCaseResponse {
    user: User
}

export class RegisterUserUseCase {

    constructor(private userRepository: UserRepository) {}

    async execute({ name, email, password }: RegisterUseCaseRequest): Promise<RegisterUseCaseResponse> {
        const userWithSameEmail = await this.userRepository.findByEmail(email)
        if (userWithSameEmail) {
            throw new UserAlreadyExistError()
        }

        const passwordHash = await hash(password, BCRYPT_ROUNDS)
        const user = User.create({ name, email, passwordHash })
        await this.userRepository.create(user)

        return { user }
    }
}