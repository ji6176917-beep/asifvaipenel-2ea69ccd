export const ADMIN_ALERT_RECIPIENT = 'apexsmmworld@gmail.com'

export interface AdminAlertData {
  kind?: 'order' | 'deposit' | undefined
  code?: string | undefined
  amount?: string | undefined
  localAmount?: string | undefined
  name?: string | undefined
  username?: string | undefined
  email?: string | undefined
  publicId?: string | undefined
  phone?: string | undefined
  createdAt?: string | undefined
  status?: string | undefined
  method?: string | undefined
  transactionId?: string | undefined
  paymentAccount?: string | undefined
  network?: string | undefined
  screenshotUrl?: string | undefined
  platform?: string | undefined
  category?: string | undefined
  service?: string | undefined
  serviceId?: string | undefined
  quantity?: number | undefined
  link?: string | undefined
  source?: string | undefined
}

export function adminAlertKey(kind: 'order' | 'deposit', id: string) {
  return `admin-${kind}-alert-${id}`
}