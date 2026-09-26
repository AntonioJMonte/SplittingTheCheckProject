import type { Server } from 'socket.io'

export interface EmittedEvent {
    room: string
    event: string
    payload: Record<string, unknown>
}

// Dublê mínimo do Socket.io: registra tudo que foi emitido e para qual room, para os testes
// afirmarem o contrato dos eventos sem subir servidor nem abrir conexão.
export function makeFakeIo() {
    const emitted: EmittedEvent[] = []

    const io = {
        to(room: string) {
            return {
                emit(event: string, payload: Record<string, unknown>) {
                    emitted.push({ room, event, payload })
                },
            }
        },
    } as unknown as Server

    return {
        io,
        emitted,
        events: () => emitted.map(e => e.event),
    }
}
