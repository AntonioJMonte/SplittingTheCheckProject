import { compare } from "bcryptjs";
import { User } from "../../../domain/entities/user";
import { InvalidCredentialsError } from "../../../shared/errors/invalid-credentials-error";
import { UserRepository } from "../../repositories/users-repository";

interface AuthUserUseCaseRequest {
    email: string
    password: string
}

interface AuthUserUseCaseResponse {
    user: User
}

export class AuthUserUseCase {

    constructor (
        private userRepository: UserRepository,
    ) {}

    async execute({ email, password }: AuthUserUseCaseRequest): Promise <AuthUserUseCaseResponse> {
        
        const user = await this.userRepository.findByEmail(email)
        if (!user) {
            throw new InvalidCredentialsError()
        }

        
        const doesPasswordMatch = await compare(password, user.passwordHash)
        if (!doesPasswordMatch) {
            throw new InvalidCredentialsError()
        }

        return {
            user
        }
    }


}