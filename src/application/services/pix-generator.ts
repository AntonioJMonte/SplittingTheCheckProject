export interface PixGenerator {
    generate(params: {
        pixKey: string
        recipientName: string
        amount: string
    }): string
}
