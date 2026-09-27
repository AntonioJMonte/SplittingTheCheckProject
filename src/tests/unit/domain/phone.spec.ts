import { describe, it, expect } from 'vitest'
import { Phone } from '../../../domain/value-objects/phone'
import { InvalidPhoneError } from '../../../domain/errors/invalid-phone-error'

describe('Phone (D-76)', () => {
    it.each([
        ['11987654321', '+5511987654321'],
        ['(11) 98765-4321', '+5511987654321'],
        ['11 98765 4321', '+5511987654321'],
        ['+55 11 98765-4321', '+5511987654321'],
        ['5511987654321', '+5511987654321'],
        ['+5511987654321', '+5511987654321'],
    ])('normaliza %s para %s', (entrada, esperado) => {
        expect(new Phone(entrada).value).toBe(esperado)
    })

    it('trata todas as grafias do mesmo número como iguais', () => {
        const digitado = new Phone('(11) 98765-4321')
        const salvo = new Phone('+5511987654321')

        expect(digitado.equals(salvo)).toBe(true)
    })

    it('aceita fixo com DDD, sem o nono dígito', () => {
        expect(new Phone('1134567890').value).toBe('+551134567890')
    })

    it('preserva o DDI quando o número já vem internacional', () => {
        expect(new Phone('+14155552671').value).toBe('+14155552671')
    })

    it.each([
        ['', 'vazio'],
        ['   ', 'só espaços'],
        ['abcdef', 'sem dígitos'],
        ['987654321', 'sem DDD'],
        ['1', 'curto demais'],
        ['+5511987654321987654', 'acima do limite do E.164'],
    ])('recusa %s (%s)', entrada => {
        expect(() => new Phone(entrada)).toThrow(InvalidPhoneError)
    })
})
