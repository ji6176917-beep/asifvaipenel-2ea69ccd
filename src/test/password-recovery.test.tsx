import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ send: vi.fn(), verify: vi.fn(), update: vi.fn(), user: vi.fn(), navigate: vi.fn(), error: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { resetPasswordForEmail: mocks.send, verifyOtp: mocks.verify, updateUser: mocks.update, getUser: mocks.user } } }));
vi.mock('@tanstack/react-router', () => ({ createFileRoute: () => (options: unknown) => options, useNavigate: () => mocks.navigate }));
vi.mock('@tanstack/react-query', () => ({ useQuery: () => ({ data: null }) }));
vi.mock('@/lib/queries', () => ({ settingsQuery: {} }));
vi.mock('@/lib/i18n', () => ({ useTr: () => (s: string) => s }));
vi.mock('sonner', () => ({ toast: { error: mocks.error, success: vi.fn() } }));
vi.mock('@/components/StrengthBar', () => ({ StrengthBar: () => null }));
import { Forgot } from '@/routes/forgot-password';

async function sendCode() {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'customer@example.test' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send verification code' }));
  await screen.findByLabelText('Verification Code');
}
async function verifyCode() {
  fireEvent.change(screen.getByLabelText('Verification Code'), { target: { value: '123456' } });
  fireEvent.click(screen.getByRole('button', { name: 'Verify code' }));
}
describe('Recovery code gating', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.send.mockResolvedValue({ error: null });
    mocks.verify.mockResolvedValue({ data: { session: { user: { id: 'verified-user' } }, user: { id: 'verified-user' } }, error: null });
    mocks.user.mockResolvedValue({ data: { user: { id: 'verified-user' } }, error: null });
    mocks.update.mockResolvedValue({ error: null });
  });
  afterEach(cleanup);
  it('does not advance when sending fails', async () => {
    mocks.send.mockResolvedValue({ error: { message: 'rate limited' } });
    render(<Forgot />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'customer@example.test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send verification code' }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalled());
    expect(screen.queryByLabelText('Verification Code')).toBeNull();
  });
  it('rejects invalid codes without unlocking passwords or updating them', async () => {
    mocks.verify.mockResolvedValue({ data: {}, error: { message: 'invalid' } });
    render(<Forgot />); await sendCode(); await verifyCode();
    await waitFor(() => expect(mocks.error).toHaveBeenCalled());
    expect(screen.queryByLabelText('New Password')).toBeNull();
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it('verifies recovery first, then updates only the verified account', async () => {
    render(<Forgot />); await sendCode();
    expect(screen.queryByLabelText('New Password')).toBeNull();
    await verifyCode(); await screen.findByLabelText('New Password');
    expect(mocks.verify).toHaveBeenCalledWith({ email: 'customer@example.test', token: '123456', type: 'recovery' });
    expect(mocks.update).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('New Password'), { target: { value: 'Example-password-2026' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'Example-password-2026' } });
    fireEvent.click(screen.getByRole('button', { name: 'Change Password' }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith({ password: 'Example-password-2026' }));
    expect(mocks.navigate).toHaveBeenCalledWith({ to: '/' });
  });
  it('blocks password changes if the verified session changes', async () => {
    mocks.user.mockResolvedValue({ data: { user: { id: 'different-user' } }, error: null });
    render(<Forgot />); await sendCode(); await verifyCode(); await screen.findByLabelText('New Password');
    fireEvent.change(screen.getByLabelText('New Password'), { target: { value: 'Example-password-2026' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'Example-password-2026' } });
    fireEvent.click(screen.getByRole('button', { name: 'Change Password' }));
    await screen.findByLabelText('Email');
    expect(mocks.update).not.toHaveBeenCalled();
  });
});