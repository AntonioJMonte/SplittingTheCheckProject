import { User } from "@prisma/client";
import { UserRepository } from "../../repositories/user-respository";
import { hash } from "bcryptjs";
import { UserAlreadyExistError } from "../../../shared/errors/user-already-exist-error";


interface RegisterUseCaseRequest {
    name: string, 
    email: string,
    password: string
}

interface RegisterUseCaseResponse {
    user: User
}

export class RegisterUserUseCase {

    constructor (private userRepository: UserRepository) {}

    async execute({ name, email, password }: RegisterUseCaseRequest): Promise <RegisterUseCaseResponse> {
        
        const passwordHash = await hash(password, 6)

        const UserWithSameEmail = this.userRepository.findByEmail(email)
        if (!UserWithSameEmail) {
            throw new UserAlreadyExistError()
        }
        
        const user = await this.userRepository.create({
            name, 
            email, 
            passwordHash,
        })

        return {
            user,
        }
    }


}