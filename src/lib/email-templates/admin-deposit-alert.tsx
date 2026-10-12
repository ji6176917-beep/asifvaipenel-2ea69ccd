import * as React from 'react'
import type { TemplateEntry } from './registry'
import { AdminActivityEmail } from './admin-activity'
import { ADMIN_ALERT_RECIPIENT, type AdminAlertData } from './admin-alert-data'

export const template = {
  component: (data: AdminAlertData) => <AdminActivityEmail {...data} kind="deposit" />,
  subject: (data: AdminAlertData) => `💰 নতুন ডিপোজিট #${data.code ?? '—'} · ${data.amount ?? ''} | Apex SMM World`,
  displayName: 'Admin — new deposit request',
  to: ADMIN_ALERT_RECIPIENT,
  previewData: { code: 'ADD-123456', amount: '$10.00', localAmount: '৳1,300.00 BDT', name: 'Demo Customer', username: 'demo_user', email: 'customer@example.com', publicId: '12345678', method: 'bKash', transactionId: 'DEMO-TXN-12345', paymentAccount: 'Demo payment account', status: 'Pending', createdAt: '12 Oct 2026, 10:15 PM' },
} satisfies TemplateEntry