// ============================================
// PSX Portfolio Tracker — Email Utility
// Nodemailer transport for SMTP email sending
// ============================================

import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;

  const port = Number(process.env.SMTP_PORT || 587);
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  try {
    const transport = getTransporter();
    await transport.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      html,
    });
    return true;
  } catch (err) {
    console.error(`Email to ${to} failed:`, err);
    return false;
  }
}

export async function sendBulkEmails(
  recipients: Array<{ email: string; subject: string; html: string }>
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  for (const r of recipients) {
    const ok = await sendEmail(r.email, r.subject, r.html);
    if (ok) sent++;
    else failed++;
  }
  return { sent, failed };
}
