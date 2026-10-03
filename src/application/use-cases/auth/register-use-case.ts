import { hash } from "bcryptjs";
import { User } from "../../../domain/entities/user";
import { Phone } from "../../../domain/value-objects/phone";
import { UserAlreadyExistError } from "../../../shared/errors/user-already-exist-error";
import { PhoneAlreadyInUseError } from "../../../shared/errors/phone-already-in-use-error";
import { UserRepository } from "../../repositories/users-repository";

// D-69: 6 rounds deixavam o hash ~16x mais barato de quebrar offline. O custo fica em torno
// de 250ms, irrelevante em uma rota que roda uma vez por conta. Hashes antigos seguem válidos:
// o bcrypt grava o custo dentro do próprio hash.
const BCRYPT_ROUNDS = 12

interface RegisterUseCaseRequest {
    name: string
    email: string
    password: string
    phone?: string
}

interface RegisterUseCaseResponse {
    user: User
}

export class RegisterUserUseCase {

    // D-85: o custo é injetável só para os testes não pagarem 12 rounds por usuário registrado.
    // Quem não passa nada recebe o valor de produção.
    constructor(
        private userRepository: UserRepository,
        private bcryptRounds: number = BCRYPT_ROUNDS,
    ) {}

    async execute({ name, email, password, phone }: RegisterUseCaseRequest): Promise<RegisterUseCaseResponse> {
        const userWithSameEmail = await this.userRepository.findByEmail(email)
        if (userWithSameEmail) {
            throw new UserAlreadyExistError()
        }

        // Normaliza antes de consultar: o `@unique` do banco é sobre o formato E.164, então a
        // checagem precisa usar a mesma forma canônica para não deixar passar um duplicado.
        if (phone) {
            const normalized = new Phone(phone).value
            const userWithSamePhone = await this.userRepository.findByPhone(normalized)
            if (userWithSamePhone) {
                throw new PhoneAlreadyInUseError()
            }
        }

        const passwordHash = await hash(password, this.bcryptRounds)
        const user = User.create({ name, email, passwordHash, phone })
        await this.userRepository.create(user)

        return { user }
    }
}
