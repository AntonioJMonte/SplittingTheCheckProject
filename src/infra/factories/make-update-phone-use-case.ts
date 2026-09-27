import { UpdatePhoneUseCase } from "../../application/use-cases/users/update-phone-use-case";
import { PrismaUserRepository } from "../database/prisma/prismaUserRepository";

export function makeUpdatePhoneUseCase() {
    return new UpdatePhoneUseCase(new PrismaUserRepository())
}
