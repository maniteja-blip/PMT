import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('cn utility', () => {
    it('merges class names correctly', () => {
        expect(cn('w-full', 'h-full')).toBe('w-full h-full')
    })

    it('handles conditional classes', () => {
        const isTrue = true
        const isFalse = false
        expect(cn('base', isTrue && 'active', isFalse && 'inactive')).toBe('base active')
    })

    it('merges tailwind classes properly (resolving conflicts)', () => {
        // p-4 should overwrite p-2
        expect(cn('p-2', 'p-4')).toBe('p-4')
    })

    it('handles array inputs', () => {
        expect(cn(['foo', 'bar'], 'baz')).toBe('foo bar baz')
    })
})
