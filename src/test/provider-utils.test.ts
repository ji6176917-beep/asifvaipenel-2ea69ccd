import { describe, expect, it } from 'vitest'
import { markedUpRate, normalizeProviderServices, providerOrderStatus, validateProviderUrl, providerServiceAvailable } from '@/lib/provider-utils'

describe('provider business rules', () => {
  it('adds 20 percent to a provider price of 10', () => { expect(markedUpRate(10, 20)).toBe(12) })
  it('keeps provider names and categories during import', () => {
    const result = normalizeProviderServices([{ service: 45, name: 'Facebook Likes', category: 'Facebook Real', rate: '2', min: '10', max: '1000', type: 'Default' }])
    expect(result.rows[0]).toMatchObject({ service: '45', name: 'Facebook Likes', category: 'Facebook Real', platform: 'facebook', rate: 2 })
  })
  it('imports every service type including custom comments and packages', () => {
    const result = normalizeProviderServices(['Default', 'Package', 'Custom Comments', 'Subscriptions'].map((type, i) => ({ service: i+1, name: type, category: 'Facebook', rate: 1, min: 1, max: 100, type })))
    expect(result.rows.map(r => r.type)).toEqual(['Default', 'Package', 'Custom Comments', 'Subscriptions'])
  })
  it('imports more than one thousand services without truncation', () => {
    expect(normalizeProviderServices(Array.from({length: 1201}, (_,i) => ({service:i+1,name:'Likes',category:'Facebook',rate:1,min:1,max:100}))).rows).toHaveLength(1201)
  })
  it('marks upstream disabled services unavailable', () => { expect(providerServiceAvailable({status:'disabled'})).toBe(false); expect(providerServiceAvailable({active:false})).toBe(false); expect(providerServiceAvailable({status:'active'})).toBe(true) })
  it('accepts an empty authoritative catalog so removed services can be hidden', () => { expect(normalizeProviderServices([]).rows).toEqual([]) })
  it('rejects malformed partial catalogs rather than closing missing services', () => { expect(() => normalizeProviderServices([{service:1}])).toThrow() })
  it('maps 40 remains of 100 to 60 delivered', () => { expect(providerOrderStatus('Partial', 100, '40')).toEqual({ status: 'partial', delivered: 60 }) })
  it('rejects local provider URLs', () => { expect(() => validateProviderUrl('https://127.0.0.1/api')).toThrow() })
  it('accepts the supplied provider address', () => { expect(validateProviderUrl('https://royalsmmworld.com/api/v2')).toBe('https://royalsmmworld.com/api/v2') })
})