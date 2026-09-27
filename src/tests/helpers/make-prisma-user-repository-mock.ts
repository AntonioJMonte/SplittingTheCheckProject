export function makePrismaUserRepositoryMock(store: { items: any[] }) {
    return {
        PrismaUserRepository: class {
            async create(data: any) {
                store.items.push(data)
            }
            async findByEmail(email: string) {
                return store.items.find((u: any) => u.email.value === email) ?? null
            }
            async findByPhone(phone: string) {
                return store.items.find((u: any) => u.phone?.value === phone) ?? null
            }
            async findById(id: string) {
                return store.items.find((u: any) => u.id === id) ?? null
            }
            async updatePixKey(userId: string, pixKey: string | null) {
                const item = store.items.find((u: any) => u.id === userId)
                if (item) (item as any).pixKey = pixKey ?? undefined
            }
            async updatePhone(userId: string, phone: string | null) {
                const index = store.items.findIndex((u: any) => u.id === userId)
                if (index !== -1) store.items[index] = store.items[index].withPhone(phone)
            }
        },
    }
}
