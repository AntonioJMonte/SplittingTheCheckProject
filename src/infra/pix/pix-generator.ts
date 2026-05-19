import { randomUUID } from 'node:crypto'
import { PixGenerator } from '../../application/services/pix-generator'

function field(id: string, value: string): string {
    return `${id}${String(value.length).padStart(2, '0')}${value}`
}

function crc16(str: string): string {
    let crc = 0xffff
    for (let i = 0; i < str.length; i++) {
        crc ^= str.charCodeAt(i) << 8
        for (let j = 0; j < 8; j++) {
            crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1
        }
    }
    return ((crc & 0xffff) >>> 0).toString(16).toUpperCase().padStart(4, '0')
}

export class BrazilianPixGenerator implements PixGenerator {
    generate(params: { pixKey: string; recipientName: string; amount: string }): string {
        const name = params.recipientName
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .replace(/[^a-zA-Z0-9 ]/g, '')
            .trim()
            .slice(0, 25)
            .toUpperCase()

        const txid = randomUUID().replace(/-/g, '').slice(0, 25)

        const merchantAccountInfo =
            field('00', 'BR.GOV.BCB.PIX') +
            field('01', params.pixKey)

        const additionalData = field('05', txid)

        const payload =
            field('00', '01') +
            field('26', merchantAccountInfo) +
            field('52', '0000') +
            field('53', '986') +
            field('54', params.amount) +
            field('58', 'BR') +
            field('59', name || 'RECEBEDOR') +
            field('60', 'BRASIL') +
            field('62', additionalData) +
            '6304'

        return payload + crc16(payload)
    }
}
