

export class InvalidCredentialsError extends Error {
    constructor () {
        super('Email or Password incorrect')
    }

}