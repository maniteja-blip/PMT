import { describe, it, expect } from 'vitest'
import { createProjectSchema, createTaskSchema } from './validation'

describe('createProjectSchema', () => {
    it('validates a correct project', () => {
        const validData = {
            name: 'New Website',
            description: 'A brand new corporate website',
            ownerId: 'user_123',
            targetDate: '2025-12-31'
        }
        const result = createProjectSchema.safeParse(validData)
        expect(result.success).toBe(true)
    })

    it('fails if name is too short', () => {
        const invalidData = {
            name: 'A', // Too short
            ownerId: 'user_123'
        }
        const result = createProjectSchema.safeParse(invalidData)
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error.issues[0].message).toBe("Project name is too short")
        }
    })

    it('requires ownerId', () => {
        const invalidData = {
            name: 'Valid Name',
            // ownerId missing
        }
        const result = createProjectSchema.safeParse(invalidData)
        expect(result.success).toBe(false)
    })
})

describe('createTaskSchema', () => {
    it('validates a correct task', () => {
        const validData = {
            title: 'Fix Login Bug',
            projectId: 'proj_123',
            priority: 'HIGH',
            status: 'TODO',
            estimateHours: '2.5' // String input handled by pipe
        }
        const result = createTaskSchema.safeParse(validData)
        expect(result.success).toBe(true)
        // Check transformation
        if (result.success) {
            expect(result.data.estimateHours).toBe(2.5)
        }
    })

    it('defaults properly when optional fields are missing', () => {
        const minimalData = {
            title: 'Simple Task',
            projectId: 'proj_123'
        }
        const result = createTaskSchema.safeParse(minimalData)
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data.priority).toBe('MEDIUM')
            expect(result.data.status).toBe('TODO')
            expect(result.data.estimateHours).toBe(2)
        }
    })

    it('fails on invalid enum values', () => {
        const invalidData = {
            title: 'Simple Task',
            projectId: 'proj_123',
            priority: 'SUPER_URGENT' // Invalid
        }
        const result = createTaskSchema.safeParse(invalidData)
        expect(result.success).toBe(false)
    })
})
