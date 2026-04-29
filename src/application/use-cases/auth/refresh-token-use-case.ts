import { User } from '@prisma/client';
import { UserRepository } from "../../repositories/user-respository";
import { InvalidCredentialsError } from '../../../shared/errors/invalid-credentials-error';
import { verify } from 'jsonwebtoken';
import { env } from '../../../infra/env';

interface RefreshTokenUseCaseRequest {
  refreshToken: string
}

interface RefreshTokenUseCaseResponse {
  user: User
}

export class RefreshTokenUseCase {
  constructor(private userRepository: UserRepository) {}

  async execute({ refreshToken }: RefreshTokenUseCaseRequest): Promise<RefreshTokenUseCaseResponse> {
    let userId: string

    try {
      const payload = verify(refreshToken, env.JWT_REFRESH_SECRET) as { sub: string }
      userId = payload.sub
    } 
    catch {
      throw new InvalidCredentialsError()
    }

    const user = await this.userRepository.findById(userId)
    if (!user) {
      throw new InvalidCredentialsError()
    }

    return { user }
  }
}