import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class InvoiceWhatsappService {
  private client: any;

  constructor(private readonly configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    if (accountSid && authToken) {
      const twilio = require('twilio');
      this.client = twilio(accountSid, authToken);
    }
  }

  async sendInvoiceWhatsapp(params: {
    recipientPhone: string;
    invoice: any;
    clinicName: string;
  }) {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'WhatsApp service not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables.',
      );
    }

    const { recipientPhone, invoice, clinicName } = params;
    const items = (invoice.items || [])
      .map((item: any) => `- ${item.description} -- ${item.lineTotal}`)
      .join('\n');

    const body = [
      `*${clinicName}*`,
      `Factura ${invoice.consecutivo}`,
      `Fecha: ${new Date(invoice.createdAt).toLocaleDateString('es-CR')}`,
      `Total: ${invoice.summary?.totalVoucher || 0}`,
      `Estado: ${invoice.haciendaStatus}`,
      '',
      'Detalle:',
      items,
      '',
      'Gracias por su visita.',
    ].join('\n');

    const from = this.configService.get<string>(
      'TWILIO_WHATSAPP_FROM',
      'whatsapp:+14155238886',
    );

    await this.client.messages.create({
      body,
      from,
      to: `whatsapp:${recipientPhone}`,
    });

    return { message: 'WhatsApp message sent successfully' };
  }
}
