import { Prisma, User } from "@prisma/client";
import { UserRepository } from "../../../application/repositories/user-repository";

export class PrismaUserRepository implements UserRepository{

    
    create(data: Prisma.UserCreateInput): Promise<User> {
        throw new Error("Method not implemented.");
    }
    findByEmail(email: string): Promise<User> {
        throw new Error("Method not implemented.");
    }
    findById(id: string): Promise<User> {
        throw new Error("Method not implemented.");
    }


}