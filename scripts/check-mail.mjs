// Checks SMTP_URL from backend/.env. No argument: login only, sends nothing. With an address: sends one test email.
// Usage: npm run check:mail [you@example.com]
import { createRequire } from 'node:module';

const require = createRequire(new URL('../backend/package.json', import.meta.url));
require('dotenv').config({ path: new URL('../backend/.env', import.meta.url).pathname });
const nodemailer = require('nodemailer');

const url = process.env.SMTP_URL;
const to = process.argv[2];
if (!url) {
  console.error('SMTP_URL is empty in backend/.env — emails are only logged, not sent.');
  process.exit(1);
}
const host = url.replace(/^.*@/, '').replace(/\/.*$/, ''); // never print the credentials part
if (/USER:PASS@/.test(url)) {
  console.error(`SMTP_URL still contains the example USER:PASS placeholder (${host}). Put your real username and password in.`);
  process.exit(1);
}

const transport = nodemailer.createTransport(url);
try {
  await transport.verify();
  console.log(`✓ Logged in to ${host}`);
  if (to) {
    const info = await transport.sendMail({ from: process.env.MAIL_FROM, to, subject: 'Recruiter app: SMTP test', text: 'If you can read this, outreach emails will be delivered.' });
    console.log(`✓ Test email sent to ${to} (id ${info.messageId}). Check the inbox and the spam folder.`);
  }
} catch (e) {
  console.error(`✗ ${host}: ${e.code ?? ''} ${String(e.message).split('\n')[0]}`);
  if (e.code === 'EAUTH' && /gmail/.test(host)) console.error('  Gmail needs a 16-character App Password (2-Step Verification on), written without spaces, and %40 instead of @ in the username.');
  process.exit(1);
}
