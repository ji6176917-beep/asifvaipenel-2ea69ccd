export const ADMIN_ALERT_RECIPIENT = 'apexsmmworld@gmail.com'

export interface AdminAlertData {
  kind?: 'order' | 'deposit'
  code?: string
  amount?: string
  localAmount?: string
  name?: string
  username?: string
  email?: string
  publicId?: string
  phone?: string
  createdAt?: string
  status?: string
  method?: string
  transactionId?: string
  paymentAccount?: string
  network?: string
  screenshotUrl?: string
  platform?: string
  category?: string
  service?: string
  serviceId?: string
  quantity?: number
  link?: string
  source?: string
}

export function adminAlertKey(kind: 'order' | 'deposit', id: string) {
  return `admin-${kind}-alert-${id}`
}