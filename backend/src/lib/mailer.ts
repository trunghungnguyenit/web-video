// ─── Gửi email License Key qua Gmail SMTP (Nodemailer) ─────────────────────

import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env';

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!env.gmailUser || !env.gmailAppPassword) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: env.gmailUser, pass: env.gmailAppPassword },
    });
  }
  return transporter;
}

export async function sendLicenseEmail(to: string, licenseKey: string): Promise<void> {
  const transport = getTransporter();
  if (!transport) throw new Error('Server chưa cấu hình GMAIL_USER/GMAIL_APP_PASSWORD.');

  await transport.sendMail({
    from: `"AI Video Studio" <${env.gmailUser}>`,
    to,
    subject: 'License Key của bạn — AI Video Studio',
    text: `License Key của bạn: ${licenseKey}\n\nDán key này vào mục Cài đặt → License để kích hoạt đầy đủ tính năng. Key gắn với tài khoản Google của bạn, không chia sẻ cho người khác.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;color:#1f2937">
        <h2 style="margin-bottom:4px">License Key của bạn</h2>
        <p style="color:#4b5563">Dán key bên dưới vào mục <strong>Cài đặt → License</strong> để kích hoạt đầy đủ tính năng AI Video Studio.</p>
        <p style="font-size:22px;font-weight:700;letter-spacing:2px;background:#f4f4f5;padding:16px;border-radius:8px;text-align:center;font-family:'Courier New',monospace">${licenseKey}</p>
        <p style="color:#9ca3af;font-size:12px">Key này gắn với tài khoản Google của bạn — không chia sẻ cho người khác.</p>
      </div>
    `,
  });
}
