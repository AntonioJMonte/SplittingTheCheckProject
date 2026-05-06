import { describe, it, expect } from 'vitest'
import { Email } from '../../../domain/value-objects/email'
import { InvalidEmailError } from '../../../domain/errors/invalid-email-error'

describe('Email VO', () => {
    it('should create valid email normalized to lowercase', () => {
        const email = new Email('John@Example.COM')
        expect(email.value).toBe('john@example.com')
    })

    it('should throw InvalidEmailError for address without @', () => {
        expect(() => new Email('not-an-email')).toThrowError(InvalidEmailError)
    })

    it('should throw InvalidEmailError for empty string', () => {
        expect(() => new Email('')).toThrowError(InvalidEmailError)
    })

    it('should throw InvalidEmailError for address without TLD', () => {
        expect(() => new Email('user@domain')).toThrowError(InvalidEmailError)
    })

    it('should consider two emails with different casing equal', () => {
        const a = new Email('user@example.com')
        const b = new Email('USER@EXAMPLE.COM')
        expect(a.equals(b)).toBe(true)
    })

    it('should consider two different addresses not equal', () => {
        const a = new Email('a@example.com')
        const b = new Email('b@example.com')
        expect(a.equals(b)).toBe(false)
    })

    it('toString should return the normalized value', () => {
        const email = new Email('User@Example.com')
        expect(email.toString()).toBe('user@example.com')
    })
})
