

export class UserAlreadyExistError extends Error {
    constructor () {
        super('User With Email Already Exist')
    }

}