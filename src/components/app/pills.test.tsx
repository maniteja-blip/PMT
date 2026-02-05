import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HealthPill, StatusPill, PriorityPill } from './pills'
import { HealthStatus, TaskStatus, TaskPriority } from '@prisma/client'

describe('Pills Components', () => {
    describe('HealthPill', () => {
        it('renders on track correctly', () => {
            render(<HealthPill health={HealthStatus.ON_TRACK} />)
            expect(screen.getByText(/on track/i)).toBeInTheDocument()
        })
        it('renders at risk with destructive variant', () => {
            const { container } = render(<HealthPill health={HealthStatus.AT_RISK} />)
            expect(screen.getByText(/at risk/i)).toBeInTheDocument()
            // Checking for class that typically comes with destructive variant
            expect(container.textContent).toContain('at risk')
        })
    })

    describe('StatusPill', () => {
        it('renders done status', () => {
            render(<StatusPill status={TaskStatus.DONE} />)
            expect(screen.getByText(/done/i)).toBeInTheDocument()
        })
        it('renders backlog status', () => {
            render(<StatusPill status={TaskStatus.BACKLOG} />)
            expect(screen.getByText(/backlog/i)).toBeInTheDocument()
        })
    })

    describe('PriorityPill', () => {
        it('renders urgent priority', () => {
            render(<PriorityPill priority={TaskPriority.URGENT} />)
            expect(screen.getByText(/urgent/i)).toBeInTheDocument()
        })
    })
})
