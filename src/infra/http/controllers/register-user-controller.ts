import { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { UserAlreadyExistError } from "../../../shared/errors/user-already-exist-error";
import { makeRegisterUseCase } from "../../factories/make-register-use-case";

const registerUserBodySchema = z.object({
    name: z.string(),
    email: z.email(),
    password: z.string().min(6)
})

export async function registerUser (request: FastifyRequest, reply: FastifyReply) {
    

    const { name, email, password } = registerUserBodySchema.parse(request.body)

    try {
        const registerUseCase =  makeRegisterUseCase()    
        await registerUseCase.execute({ name, email, password })
    } 
    catch (error) {
        if (error instanceof UserAlreadyExistError) {
            return reply.status(409).send({ message: error.message }) 
        }
        throw error
    }

    reply.status(201).send()
}