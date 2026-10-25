import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Text,
} from '@react-email/components'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
  token?: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
  token,
}: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Reset your password for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src="https://apexsmmworld.com/__l5e/assets-v1/9921a3e4-716e-472d-8536-64fbefa8c532/apex-header-logo.png" width="72" height="72" alt="Apex SMM World" style={{ margin: '0 auto 12px', display: 'block', borderRadius: '14px' }} />
        <Text style={{ textAlign: 'center' as const, fontSize: '18px', fontWeight: 'bold' as const, color: '#16a34a', margin: '0 0 24px' }}>Apex SMM World</Text>
        <Heading style={h1}>Reset your password</Heading>
        <Text style={text}>
          We received a request to reset your password for {siteName}. Enter
          the verification code below on the reset page to choose a new
          password.
        </Text>
        {token ? <Text style={codeStyle}>{token}</Text> : null}
        <Text style={text}>
          Or click the button below to reset your password directly:
        </Text>
        <Button style={button} href={confirmationUrl}>
          Reset Password
        </Button>
        <Text style={footer}>
          If you didn't request a password reset, you can safely ignore this
          email. Your password will not be changed.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#000000',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#55575d',
  lineHeight: '1.5',
  margin: '0 0 25px',
}
const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '40px',
  fontWeight: 'bold' as const,
  letterSpacing: '8px',
  textAlign: 'center' as const,
  color: '#16a34a',
  backgroundColor: '#f0fdf4',
  border: '1px solid #bbf7d0',
  borderRadius: '8px',
  padding: '18px 0',
  margin: '0 0 25px',
}
const button = {
  backgroundColor: '#16a34a',
  color: '#ffffff',
  fontSize: '14px',
  border: '1px solid #16a34a',
  borderRadius: '8px',
  padding: '12px 20px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
