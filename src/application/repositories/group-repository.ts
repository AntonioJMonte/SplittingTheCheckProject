import { Group } from '../../domain/entities/group'

export interface GroupRepository {
    create(data: Group): Promise<void>
    findById(id: string): Promise<Group | null>
    findByUserId(userId: string): Promise<Group[]>
    update(data: Group): Promise<void>
    delete(groupId: string): Promise<void>
}
