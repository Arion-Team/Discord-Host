import { dbGet } from '../db/database.js';

export function resetClient() {}

export async function sendMail(to: string, subject: string, html: string) {
  console.log(`[Email] Would send to ${to}: ${subject} (Discord verification is primary)`);
  return { messageId: null, skipped: true };
}

export async function testResendConnection(apiKey: string) {
  return { success: false, message: 'Email service disabled. Use Discord bot for verification.' };
}

export async function sendTestEmail(apiKey: string, fromEmail: string, toEmail: string) {
  return { success: false, message: 'Email service disabled. Use Discord bot for verification.' };
}

export function buildVerificationEmail(username: string, code: string) {
  return `<p>Verification code: <strong>${code}</strong></p>`;
}

export function buildResetEmail(username: string, resetUrl: string) {
  return `<p>Reset password: <a href="${resetUrl}">${resetUrl}</a></p>`;
}
