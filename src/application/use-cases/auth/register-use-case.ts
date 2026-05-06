import { hash } from "bcryptjs";
import { User } from "../../../domain/entities/user";
import { UserAlreadyExistError } from "../../../shared/errors/user-already-exist-error";
import { UserRepository } from "../../repositories/users-repository";

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

        const passwordHash = await hash(password, 6)
        const user = User.create({ name, email, passwordHash })
        await this.userRepository.create(user)

        return { user }
    }
}