import { describe, expect, it } from 'vitest'
import { markedUpRate, normalizeProviderServices, providerOrderStatus, validateProviderUrl } from '@/lib/provider-utils'

describe('provider business rules', () => {
  it('adds 20 percent to a provider price of 10', () => { expect(markedUpRate(10, 20)).toBe(12) })
  it('keeps provider names and categories during import', () => {
    const result = normalizeProviderServices([{ service: 45, name: 'Facebook Likes', category: 'Facebook Real', rate: '2', min: '10', max: '1000', type: 'Default' }])
    expect(result.rows[0]).toMatchObject({ service: '45', name: 'Facebook Likes', category: 'Facebook Real', platform: 'facebook', rate: 2 })
  })
  it('does not import unsupported comment inputs as regular orders', () => {
    expect(() => normalizeProviderServices([{ service: 2, name: 'Comments', category: 'Facebook', rate: 1, min: 1, max: 100, type: 'Custom Comments' }])).toThrow()
  })
  it('maps 40 remains of 100 to 60 delivered', () => { expect(providerOrderStatus('Partial', 100, '40')).toEqual({ status: 'partial', delivered: 60 }) })
  it('rejects local provider URLs', () => { expect(() => validateProviderUrl('https://127.0.0.1/api')).toThrow() })
  it('accepts the supplied provider address', () => { expect(validateProviderUrl('https://royalsmmworld.com/api/v2')).toBe('https://royalsmmworld.com/api/v2') })
})