export function makePrismaUserRepositoryMock(store: { items: any[] }) {
    return {
        PrismaUserRepository: class {
            async create(data: any) {
                store.items.push(data)
            }
            async findByEmail(email: string) {
                return store.items.find((u: any) => u.email.value === email) ?? null
            }
            async findById(id: string) {
                return store.items.find((u: any) => u.id === id) ?? null
            }
        },
    }
}
