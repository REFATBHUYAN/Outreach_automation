import nodemailer from 'nodemailer';
import { env } from '../config/env';

// With SMTP_URL (e.g. Mailtrap/Ethereal) mail is really sent; otherwise it is logged (mocked).
const transport = env.SMTP_URL ? nodemailer.createTransport(env.SMTP_URL) : nodemailer.createTransport({ jsonTransport: true });

export async function sendMail(to: string, subject: string, text: string) {
  const info = await transport.sendMail({ from: env.MAIL_FROM, to, subject, text });
  if (!env.SMTP_URL) console.log(`[mail:mock] to=${to} subject="${subject}"`);
  return info.messageId;
}
