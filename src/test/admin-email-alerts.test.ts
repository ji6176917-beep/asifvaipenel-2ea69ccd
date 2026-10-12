import { describe, expect, it, vi, beforeEach } from 'vitest'

const send = vi.hoisted(() => vi.fn())
vi.mock('@lovable.dev/email-js', () => ({ sendLovableEmail: send, EmailAPIError: class extends Error { code?: string } }))
vi.mock('@react-email/render', () => ({ render: async () => 'rendered email' }))

import { sendTemplateEmail } from '@/lib/email-templates/send-email'
import { adminAlertKey } from '@/lib/email-templates/admin-alert-data'

describe('admin event emails', () => {
  beforeEach(() => { send.mockReset(); vi.stubEnv('LOVABLE_API_KEY', 'test-only-key') })
  it('sends order alerts only to the requested admin even when another recipient is supplied', async () => {
    await sendTemplateEmail('admin-order-alert', 'other@example.com', { templateData: { code: '1234567890' }, idempotencyKey: adminAlertKey('order', 'event-1') })
    expect(send.mock.calls[0]?.[0].to).toBe('apexsmmworld@gmail.com')
  })
  it('sends deposit alerts only to the requested admin', async () => {
    await sendTemplateEmail('admin-deposit-alert', 'other@example.com', { templateData: { code: 'ADD-123456' } })
    expect(send.mock.calls[0]?.[0].to).toBe('apexsmmworld@gmail.com')
  })
  it('keeps the same dedupe key when retrying one event', async () => {
    const key = adminAlertKey('deposit', 'event-123')
    await sendTemplateEmail('admin-deposit-alert', '', { idempotencyKey: key })
    await sendTemplateEmail('admin-deposit-alert', '', { idempotencyKey: adminAlertKey('deposit', 'event-123') })
    expect(send.mock.calls.map(call => call[0].idempotency_key)).toEqual(['admin-deposit-alert-event-123', 'admin-deposit-alert-event-123'])
    expect(adminAlertKey('order', 'event-123')).not.toBe(key)
  })
})