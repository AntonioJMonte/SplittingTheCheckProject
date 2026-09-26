import { describe, it, expect } from 'vitest'
import { BrazilianPixGenerator } from '../../../../infra/pix/pix-generator'

// Implementação de referência do CRC-16/CCITT-FALSE, escrita por tabela em vez de bit a bit,
// justamente para não repetir o algoritmo do código sob teste. É validada abaixo contra o valor
// canônico do padrão (0x29B1 para "123456789") antes de ser usada para conferir o BR Code.
function crc16Reference(input: string): string {
    const table: number[] = []
    for (let byte = 0; byte < 256; byte++) {
        let value = byte << 8
        for (let bit = 0; bit < 8; bit++) {
            value = value & 0x8000 ? ((value << 1) ^ 0x1021) & 0xffff : (value << 1) & 0xffff
        }
        table[byte] = value
    }

    let crc = 0xffff
    for (let i = 0; i < input.length; i++) {
        crc = ((crc << 8) & 0xffff) ^ table[((crc >> 8) ^ input.charCodeAt(i)) & 0xff]
    }
    return crc.toString(16).toUpperCase().padStart(4, '0')
}

interface Field {
    id: string
    value: string
}

// Percorre o payload como TLV do EMV (id de 2 dígitos + tamanho de 2 dígitos + valor).
// Se algum `field()` declarar tamanho errado, o parse sai do trilho e o teste quebra.
function parseEmv(payload: string): Field[] {
    const fields: Field[] = []
    let cursor = 0
    while (cursor < payload.length) {
        const id = payload.slice(cursor, cursor + 2)
        const length = Number(payload.slice(cursor + 2, cursor + 4))
        expect(Number.isNaN(length), `tamanho inválido no campo ${id}`).toBe(false)
        const value = payload.slice(cursor + 4, cursor + 4 + length)
        expect(value, `campo ${id} mais curto que o tamanho declarado`).toHaveLength(length)
        fields.push({ id, value })
        cursor += 4 + length
    }
    return fields
}

function fieldValue(payload: string, id: string): string | undefined {
    return parseEmv(payload).find(f => f.id === id)?.value
}

describe('crc16Reference (validação da própria referência)', () => {
    it('should match the canonical CRC-16/CCITT-FALSE check value', () => {
        expect(crc16Reference('123456789')).toBe('29B1')
    })
})

describe('BrazilianPixGenerator', () => {
    const sut = new BrazilianPixGenerator()

    const params = {
        pixKey: 'ana@example.com',
        recipientName: 'Ana Souza',
        amount: '100.00',
    }

    it('should end with a CRC that matches the rest of the payload', () => {
        const code = sut.generate(params)

        const payload = code.slice(0, -4)
        const crc = code.slice(-4)

        expect(crc).toBe(crc16Reference(payload))
        expect(crc).toMatch(/^[0-9A-F]{4}$/)
    })

    it('should close the payload with the CRC field marker 6304', () => {
        const code = sut.generate(params)

        expect(code.slice(-8, -4)).toBe('6304')
    })

    it('should produce a payload whose every field parses as valid EMV TLV', () => {
        const code = sut.generate(params)
        const fields = parseEmv(code.slice(0, -4) + code.slice(-4))

        expect(fields.map(f => f.id)).toEqual(['00', '26', '52', '53', '54', '58', '59', '60', '62', '63'])
    })

    it('should carry the payload format, currency, country and amount', () => {
        const code = sut.generate(params)

        expect(fieldValue(code, '00')).toBe('01')
        expect(fieldValue(code, '52')).toBe('0000')
        expect(fieldValue(code, '53')).toBe('986')
        expect(fieldValue(code, '54')).toBe('100.00')
        expect(fieldValue(code, '58')).toBe('BR')
        expect(fieldValue(code, '60')).toBe('BRASIL')
    })

    it('should nest the pix key under the BCB merchant account field', () => {
        const code = sut.generate(params)
        const merchant = fieldValue(code, '26')!

        expect(parseEmv(merchant)).toEqual([
            { id: '00', value: 'BR.GOV.BCB.PIX' },
            { id: '01', value: 'ana@example.com' },
        ])
    })

    it('should strip accents and punctuation from the recipient name', () => {
        const code = sut.generate({ ...params, recipientName: 'José A. Conceição-Júnior' })

        expect(fieldValue(code, '59')).toBe('JOSE A CONCEICAOJUNIOR')
    })

    it('should truncate the recipient name to 25 characters', () => {
        const code = sut.generate({ ...params, recipientName: 'Maria Aparecida da Silva Santos Oliveira' })

        // O trim() do gerador roda antes do slice(0, 25), então o corte pode deixar um espaço
        // à direita. Não invalida o BR Code (o tamanho declarado acompanha), mas fica registrado.
        expect(fieldValue(code, '59')).toHaveLength(25)
        expect(fieldValue(code, '59')).toBe('MARIA APARECIDA DA SILVA ')
    })

    it('should fall back to RECEBEDOR when the name has nothing usable', () => {
        const code = sut.generate({ ...params, recipientName: '!!!@@@###' })

        expect(fieldValue(code, '59')).toBe('RECEBEDOR')
    })

    it('should emit a 25-character hexadecimal txid', () => {
        const code = sut.generate(params)
        const additional = fieldValue(code, '62')!

        expect(parseEmv(additional)[0].id).toBe('05')
        expect(parseEmv(additional)[0].value).toMatch(/^[0-9a-f]{25}$/)
    })

    it('should emit a different txid and CRC on every call', () => {
        const first = sut.generate(params)
        const second = sut.generate(params)

        expect(first).not.toBe(second)
        expect(first.slice(0, -4)).not.toBe(second.slice(0, -4))
    })

    it('should keep the CRC valid for a long pix key', () => {
        const code = sut.generate({ ...params, pixKey: 'a'.repeat(77) })

        expect(code.slice(-4)).toBe(crc16Reference(code.slice(0, -4)))
        expect(fieldValue(fieldValue(code, '26')!, '01')).toHaveLength(77)
    })
})
