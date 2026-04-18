import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class InvoiceEmailService {
  private transporter: any;

  constructor(private readonly configService: ConfigService) {
    const nodemailer = require('nodemailer');
    const host = this.configService.get<string>('SMTP_HOST');
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(this.configService.get<string>('SMTP_PORT', '587')),
        secure: false,
        auth: {
          user: this.configService.get<string>('SMTP_USER'),
          pass: this.configService.get<string>('SMTP_PASS'),
        },
      });
    }
  }

  async sendInvoiceEmail(params: {
    recipientEmail: string;
    subject: string;
    message?: string;
    pdfBuffer: Buffer;
    invoice: any;
    clinicName: string;
  }) {
    if (!this.transporter) {
      throw new ServiceUnavailableException(
        'Email service not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables.',
      );
    }

    const { recipientEmail, subject, message, pdfBuffer, invoice, clinicName } =
      params;

    const html = `
      <h2>${clinicName}</h2>
      <p>${message || 'Adjunto encontrara su comprobante electronico.'}</p>
      <table style="border-collapse:collapse;width:100%;max-width:500px">
        <tr><td style="padding:8px;border:1px solid #ddd"><strong>Consecutivo</strong></td><td style="padding:8px;border:1px solid #ddd">${invoice.consecutivo}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd"><strong>Fecha</strong></td><td style="padding:8px;border:1px solid #ddd">${new Date(invoice.createdAt).toLocaleDateString('es-CR')}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd"><strong>Total</strong></td><td style="padding:8px;border:1px solid #ddd">${invoice.summary?.totalVoucher || 0}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd"><strong>Estado</strong></td><td style="padding:8px;border:1px solid #ddd">${invoice.haciendaStatus}</td></tr>
      </table>
      <p style="color:#888;font-size:12px">Generado por ClinicCR</p>
    `;

    await this.transporter.sendMail({
      from: this.configService.get<string>(
        'SMTP_FROM',
        'noreply@cliniccr.com',
      ),
      to: recipientEmail,
      subject,
      html,
      attachments: [
        {
          filename: `factura-${invoice.consecutivo}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });

    return { message: 'Email sent successfully' };
  }
}
