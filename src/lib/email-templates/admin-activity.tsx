import * as React from 'react'
import { Body, Button, Container, Head, Heading, Html, Img, Link, Preview, Section, Text } from '@react-email/components'
import type { AdminAlertData } from './admin-alert-data'

const colors = { ink: '#17251d', green: '#16a34a', mint: '#effbf2', border: '#d7ebde', muted: '#617269', white: '#ffffff' }
const text = { color: colors.ink, fontSize: '14px', lineHeight: '1.6', margin: '8px 0', overflowWrap: 'anywhere' as const }

function Detail({ label, value }: { label: string; value?: string | number | null | undefined }) {
  return <Text style={text}><strong>{label}</strong><br />{value == null || value === '' ? '—' : value}</Text>
}

export function AdminActivityEmail(data: AdminAlertData) {
  const deposit = data.kind === 'deposit'
  const title = deposit ? '💰 নতুন ডিপোজিট রিকোয়েস্ট' : '🛒 নতুন অর্ডার'
  return (
    <Html lang="bn" dir="ltr">
      <Head />
      <Preview>{title} #{data.code ?? '—'} · {data.amount ?? '—'} · {data.name ?? 'Customer'}</Preview>
      <Body style={{ backgroundColor: colors.white, fontFamily: 'Arial, sans-serif', margin: '0' }}>
        <Container style={{ maxWidth: '580px', padding: '28px 20px' }}>
          <Img src="https://apexsmmworld.com/__l5e/assets-v1/9921a3e4-716e-472d-8536-64fbefa8c532/apex-header-logo.png" width="72" height="72" alt="Apex SMM World" style={{ margin: '0 auto 12px' }} />
          <Text style={{ ...text, textAlign: 'center', color: colors.green, fontSize: '20px', fontWeight: 'bold', marginBottom: '24px' }}>Apex SMM World</Text>
          <Heading style={{ color: colors.ink, fontSize: '23px', lineHeight: '1.4' }}>{title}</Heading>
          <Text style={text}>রেফারেন্স: <strong>#{data.code ?? '—'}</strong></Text>
          <Section style={{ backgroundColor: colors.mint, border: `1px solid ${colors.border}`, borderRadius: '8px', padding: '18px', margin: '20px 0' }}>
            <Text style={{ ...text, margin: '0', color: colors.muted }}>{deposit ? '💵 ডিপোজিটের পরিমাণ' : '💵 অর্ডারের চার্জ'}</Text>
            <Text style={{ ...text, fontSize: '30px', fontWeight: 'bold', color: colors.green, margin: '4px 0' }}>{data.amount ?? '—'}</Text>
            {data.localAmount && <Text style={{ ...text, margin: '0', fontWeight: 'bold' }}>{data.localAmount}</Text>}
            <Text style={{ ...text, marginBottom: '0' }}>📌 স্ট্যাটাস: <strong>{data.status ?? 'Pending'}</strong></Text>
            {deposit && <Text style={{ ...text, fontSize: '12px', color: colors.muted }}>পেমেন্ট যাচাই করে অনুমোদন দিন; এটি নতুন রিকোয়েস্ট, নিশ্চিত জমা নয়।</Text>}
          </Section>
          <Heading as="h2" style={{ color: colors.ink, fontSize: '17px' }}>👤 গ্রাহকের তথ্য</Heading>
          <Detail label="👤 নাম" value={data.name} />
          <Detail label="🏷️ ইউজারনেম" value={data.username} />
          <Detail label="📧 ইমেইল" value={data.email} />
          <Detail label="🆔 ইউজার আইডি" value={data.publicId} />
          {data.phone && <Detail label="📱 ফোন" value={data.phone} />}
          <Heading as="h2" style={{ color: colors.ink, fontSize: '17px', borderTop: `1px solid ${colors.border}`, paddingTop: '18px' }}>{deposit ? '🧾 পেমেন্টের বিস্তারিত' : '📦 অর্ডারের বিস্তারিত'}</Heading>
          {deposit ? <>
            <Detail label="💳 পেমেন্ট মেথড" value={data.method} />
            <Detail label="🔖 ট্রানজেকশন আইডি" value={data.transactionId} />
            <Detail label="🏦 পেমেন্ট অ্যাকাউন্ট" value={data.paymentAccount} />
            {data.network && <Detail label="🌐 নেটওয়ার্ক" value={data.network} />}
            {data.screenshotUrl && <Text style={text}><Link href={data.screenshotUrl} style={{ color: colors.green }}>📷 পেমেন্টের স্ক্রিনশট দেখুন</Link><br /><span style={{ color: colors.muted, fontSize: '12px' }}>এই নিরাপদ লিংক ২৪ ঘণ্টা কার্যকর; পরে অ্যাডমিন প্যানেলে দেখুন।</span></Text>}
          </> : <>
            <Detail label="🌐 প্ল্যাটফর্ম" value={data.platform} />
            <Detail label="📂 ক্যাটাগরি" value={data.category} />
            <Detail label="📦 সার্ভিস" value={data.service} />
            <Detail label="🔢 সার্ভিস আইডি" value={data.serviceId} />
            <Detail label="📊 পরিমাণ" value={data.quantity} />
            <Detail label="🔗 অর্ডার লিংক" value={data.link} />
            <Detail label="📥 অর্ডারের উৎস" value={data.source} />
          </>}
          <Detail label="🕒 সময় (বাংলাদেশ)" value={data.createdAt} />
          <Button href={`https://apexsmmworld.com/admin?section=${deposit ? 'add-funds' : 'orders'}`} style={{ backgroundColor: colors.green, color: colors.white, padding: '14px 20px', borderRadius: '6px', fontWeight: 'bold', fontSize: '14px', marginTop: '20px' }}>অ্যাডমিন প্যানেল খুলুন →</Button>
        </Container>
      </Body>
    </Html>
  )
}
