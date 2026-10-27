import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BottomNavBar } from './BottomNavBar'

describe('BottomNavBar', () => {
  it('renders the children in order with aria-label="Primary"', () => {
    render(
      <BottomNavBar>
        <button type="button" aria-label="Profile">
          P
        </button>
        <button type="button" aria-label="Record a Match">
          R
        </button>
        <button type="button" aria-label="Nav">
          N
        </button>
      </BottomNavBar>,
    )

    const nav = screen.getByRole('navigation', { name: 'Primary' })
    const labels = [...nav.querySelectorAll('button')].map((button) =>
      button.getAttribute('aria-label'),
    )
    expect(labels).toEqual(['Profile', 'Record a Match', 'Nav'])
  })
})
