import * as React from 'react'
import type { TemplateEntry } from './registry'
import { AdminActivityEmail } from './admin-activity'
import { ADMIN_ALERT_RECIPIENT, type AdminAlertData } from './admin-alert-data'

export const template = {
  component: (data: AdminAlertData) => <AdminActivityEmail {...data} kind="order" />,
  subject: (data: AdminAlertData) => `🛒 নতুন অর্ডার #${data.code ?? '—'} · ${data.amount ?? ''} | Apex SMM World`,
  displayName: 'Admin — new order',
  to: ADMIN_ALERT_RECIPIENT,
  previewData: { code: '1234567890', amount: '$5.00', name: 'Demo Customer', username: 'demo_user', email: 'customer@example.com', publicId: '12345678', platform: 'Facebook', category: 'Followers', service: 'Facebook Followers', serviceId: '101', quantity: 1000, link: 'https://facebook.com/example', source: 'Website', status: 'Pending', createdAt: '12 Oct 2026, 10:15 PM' },
} satisfies TemplateEntry