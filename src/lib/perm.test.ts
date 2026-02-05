import { describe, it, expect } from 'vitest'
import { isManagerish, canDeleteProject, canManageProject, RoleLike } from './perm'

describe('Permission Logic', () => {
    describe('isManagerish', () => {
        it('returns true for ADMIN', () => {
            expect(isManagerish('ADMIN')).toBe(true)
        })
        it('returns true for MANAGER', () => {
            expect(isManagerish('MANAGER')).toBe(true)
        })
        it('returns false for MEMBER', () => {
            expect(isManagerish('MEMBER')).toBe(false)
        })
    })

    describe('canDeleteProject', () => {
        it('allows ADMIN and MANAGER', () => {
            expect(canDeleteProject('ADMIN')).toBe(true)
            expect(canDeleteProject('MANAGER')).toBe(true)
        })
        it('denies MEMBER', () => {
            expect(canDeleteProject('MEMBER')).toBe(false)
        })
    })

    describe('canManageProject', () => {
        const ownerId = 'owner_1'
        const otherId = 'other_2'

        it('allows owner regardless of role', () => {
            expect(canManageProject({ role: 'MEMBER', userId: ownerId, ownerId })).toBe(true)
        })

        it('allows ADMIN/MANAGER even if not owner', () => {
            expect(canManageProject({ role: 'ADMIN', userId: otherId, ownerId })).toBe(true)
        })

        it('denies MEMBER who is not owner', () => {
            expect(canManageProject({ role: 'MEMBER', userId: otherId, ownerId })).toBe(false)
        })
    })
})
