import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { Invoice } from '../invoices/schemas/invoice.schema';
import {
  ClinicSettings,
} from '../clinic-settings/schemas/clinic-settings.schema';
import { AlertsService } from '../alerts/alerts.service';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private emailTransporter: any;
  private twilioClient: any;
  private twilioWhatsappFrom: string;

  constructor(
    @InjectModel(Invoice.name) private readonly invoiceModel: Model<Invoice>,
    @InjectModel(ClinicSettings.name)
    private readonly clinicSettingsModel: Model<ClinicSettings>,
    private readonly configService: ConfigService,
    private readonly alertsService: AlertsService,
  ) {
    // Initialize nodemailer
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    if (smtpHost) {
      const nodemailer = require('nodemailer');
      this.emailTransporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(this.configService.get<string>('SMTP_PORT', '587')),
        secure: false,
        auth: {
          user: this.configService.get<string>('SMTP_USER'),
          pass: this.configService.get<string>('SMTP_PASS'),
        },
      });
    }

    // Initialize twilio
    const twilioSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    if (twilioSid) {
      const twilio = require('twilio');
      this.twilioClient = twilio(
        twilioSid,
        this.configService.get<string>('TWILIO_AUTH_TOKEN'),
      );
    }
    this.twilioWhatsappFrom = this.configService.get<string>(
      'TWILIO_WHATSAPP_FROM',
      'whatsapp:+14155238886',
    );
  }

  async getPendingPayments(clinicId: string, paginationDto: PaginationDto) {
    const { page = 1, limit = 20, search } = paginationDto;
    const skip = (page - 1) * limit;

    const filter: any = {
      clinicId,
      saleCondition: '02',
      haciendaStatus: 'accepted',
      paymentStatus: { $ne: 'paid' },
    };

    if (search) {
      filter.$or = [
        { 'receiver.name': { $regex: search, $options: 'i' } },
        { 'receiver.identificationNumber': { $regex: search, $options: 'i' } },
        { consecutivo: { $regex: search, $options: 'i' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.invoiceModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select(
          'consecutivo receiver summary.totalVoucher paymentStatus creditTermDays remindersSent lastReminderAt createdAt',
        )
        .lean()
        .exec(),
      this.invoiceModel.countDocuments(filter),
    ]);

    const now = Date.now();
    const items = data.map((invoice: any) => {
      const dueDate =
        new Date(invoice.createdAt).getTime() +
        (invoice.creditTermDays || 0) * 86400000;
      const daysOverdue = Math.max(
        0,
        Math.floor((now - dueDate) / 86400000),
      );
      return {
        ...invoice,
        daysOverdue,
        dueDate: new Date(dueDate),
      };
    });

    return {
      data: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async sendEmailReminder(
    clinicId: string,
    invoiceId: string,
    message?: string,
  ) {
    if (!this.emailTransporter) {
      throw new ServiceUnavailableException(
        'Email service not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables.',
      );
    }

    const invoice = await this.invoiceModel.findOne({
      _id: invoiceId,
      clinicId,
    });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const recipientEmail = invoice.receiver?.email;
    if (!recipientEmail) {
      throw new NotFoundException(
        'Invoice receiver does not have an email address',
      );
    }

    const settings = await this.clinicSettingsModel.findOne({ clinicId });
    const clinicName = settings?.businessName || 'ClinicCR';
    const totalVoucher = invoice.summary?.totalVoucher || 0;
    const invoiceCreatedAt = (invoice as any).createdAt;
    const dueDate = new Date(
      new Date(invoiceCreatedAt).getTime() +
        (invoice.creditTermDays || 0) * 86400000,
    );

    const html = `
      <h2>${clinicName}</h2>
      <p>${message || 'Le recordamos que tiene un pago pendiente por la siguiente factura:'}</p>
      <table style="border-collapse:collapse;width:100%;max-width:500px">
        <tr><td style="padding:8px;border:1px solid #ddd"><strong>Consecutivo</strong></td><td style="padding:8px;border:1px solid #ddd">${invoice.consecutivo}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd"><strong>Fecha</strong></td><td style="padding:8px;border:1px solid #ddd">${new Date(invoiceCreatedAt).toLocaleDateString('es-CR')}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd"><strong>Vencimiento</strong></td><td style="padding:8px;border:1px solid #ddd">${dueDate.toLocaleDateString('es-CR')}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd"><strong>Total</strong></td><td style="padding:8px;border:1px solid #ddd">${totalVoucher}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd"><strong>Estado</strong></td><td style="padding:8px;border:1px solid #ddd">${invoice.paymentStatus}</td></tr>
      </table>
      <p>Por favor realice su pago a la brevedad posible.</p>
      <p style="color:#888;font-size:12px">Generado por ClinicCR</p>
    `;

    await this.emailTransporter.sendMail({
      from: this.configService.get<string>(
        'SMTP_FROM',
        'noreply@cliniccr.com',
      ),
      to: recipientEmail,
      subject: `Recordatorio de pago -- ${clinicName} -- Factura ${invoice.consecutivo}`,
      html,
    });

    await this.invoiceModel.findByIdAndUpdate(invoiceId, {
      $inc: { remindersSent: 1 },
      $set: { lastReminderAt: new Date() },
    });

    return { message: 'Payment reminder email sent successfully' };
  }

  async sendWhatsappReminder(clinicId: string, invoiceId: string) {
    if (!this.twilioClient) {
      throw new ServiceUnavailableException(
        'WhatsApp service not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables.',
      );
    }

    const invoice = await this.invoiceModel.findOne({
      _id: invoiceId,
      clinicId,
    });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const recipientPhone = invoice.receiver?.phone;
    if (!recipientPhone) {
      throw new NotFoundException(
        'Invoice receiver does not have a phone number',
      );
    }

    const settings = await this.clinicSettingsModel.findOne({ clinicId });
    const clinicName = settings?.businessName || 'ClinicCR';
    const totalVoucher = invoice.summary?.totalVoucher || 0;
    const invoiceCreatedAt = (invoice as any).createdAt;
    const dueDate = new Date(
      new Date(invoiceCreatedAt).getTime() +
        (invoice.creditTermDays || 0) * 86400000,
    );

    const body = [
      `*${clinicName} -- Recordatorio de Pago*`,
      '',
      `Factura: ${invoice.consecutivo}`,
      `Fecha: ${new Date(invoiceCreatedAt).toLocaleDateString('es-CR')}`,
      `Vencimiento: ${dueDate.toLocaleDateString('es-CR')}`,
      `Total: ${totalVoucher}`,
      `Estado: ${invoice.paymentStatus}`,
      '',
      'Por favor realice su pago a la brevedad posible.',
      '',
      'Gracias.',
    ].join('\n');

    await this.twilioClient.messages.create({
      body,
      from: this.twilioWhatsappFrom,
      to: `whatsapp:${recipientPhone}`,
    });

    await this.invoiceModel.findByIdAndUpdate(invoiceId, {
      $inc: { remindersSent: 1 },
      $set: { lastReminderAt: new Date() },
    });

    return { message: 'Payment reminder WhatsApp sent successfully' };
  }

  async markAsPaid(clinicId: string, invoiceId: string) {
    const invoice = await this.invoiceModel.findOneAndUpdate(
      { _id: invoiceId, clinicId },
      { $set: { paymentStatus: 'paid' } },
      { new: true },
    );
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Dismiss any related alerts
    await this.alertsService.dismissByReference(
      clinicId,
      'invoice',
      invoiceId,
    );

    return invoice;
  }

  @Cron('0 8 * * *')
  async checkOverduePayments() {
    this.logger.log('Running overdue payments check...');

    try {
      const invoices: any[] = await this.invoiceModel
        .find({
          saleCondition: '02',
          haciendaStatus: 'accepted',
          paymentStatus: { $ne: 'paid' },
        })
        .lean()
        .exec();

      const now = Date.now();

      for (const invoice of invoices) {
        const dueDate =
          new Date(invoice.createdAt).getTime() +
          (invoice.creditTermDays || 0) * 86400000;
        const daysUntilDue = Math.floor((dueDate - now) / 86400000);
        const clinicId = invoice.clinicId.toString();
        const invoiceId = invoice._id.toString();
        const receiverName = invoice.receiver?.name || 'Cliente';
        const totalVoucher = invoice.summary?.totalVoucher || 0;

        if (daysUntilDue <= 3 && daysUntilDue > 0) {
          // Due in 3 days or less — info alert
          const existing = await this.alertsService.findExistingAlert(
            clinicId,
            'invoice',
            invoiceId,
            'payment_reminder',
          );
          if (!existing) {
            await this.alertsService.createAlert({
              clinicId,
              type: 'payment_reminder',
              title: `Pago proximo a vencer`,
              message: `La factura ${invoice.consecutivo} de ${receiverName} por ${totalVoucher} vence en ${daysUntilDue} dia(s).`,
              referenceType: 'invoice',
              referenceId: invoiceId,
              severity: 'info',
            });
          }
        } else if (daysUntilDue <= 0 && daysUntilDue > -7) {
          // Overdue 1-7 days — warning alert
          await this.invoiceModel.findByIdAndUpdate(invoiceId, {
            $set: { paymentStatus: 'overdue' },
          });

          const existing = await this.alertsService.findExistingAlert(
            clinicId,
            'invoice',
            invoiceId,
            'payment_overdue',
          );
          if (!existing) {
            await this.alertsService.createAlert({
              clinicId,
              type: 'payment_overdue',
              title: `Pago vencido`,
              message: `La factura ${invoice.consecutivo} de ${receiverName} por ${totalVoucher} esta vencida por ${Math.abs(daysUntilDue)} dia(s).`,
              referenceType: 'invoice',
              referenceId: invoiceId,
              severity: 'warning',
            });
          }
        } else if (daysUntilDue <= -7) {
          // Overdue 7+ days — critical alert
          await this.invoiceModel.findByIdAndUpdate(invoiceId, {
            $set: { paymentStatus: 'overdue' },
          });

          const existing = await this.alertsService.findExistingAlert(
            clinicId,
            'invoice',
            invoiceId,
            'payment_overdue',
          );
          if (!existing) {
            await this.alertsService.createAlert({
              clinicId,
              type: 'payment_overdue',
              title: `Pago vencido critico`,
              message: `La factura ${invoice.consecutivo} de ${receiverName} por ${totalVoucher} esta vencida por ${Math.abs(daysUntilDue)} dia(s).`,
              referenceType: 'invoice',
              referenceId: invoiceId,
              severity: 'critical',
            });
          }
        }
      }

      this.logger.log(
        `Overdue payments check complete. Processed ${invoices.length} invoices.`,
      );
    } catch (error) {
      this.logger.error('Error checking overdue payments', error);
    }
  }
}
