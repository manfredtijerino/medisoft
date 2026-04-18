import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Patient } from '../patients/schemas/patient.schema';
import { Invoice } from '../invoices/schemas/invoice.schema';
import { GoogleCalendarService } from '../google-calendar/google-calendar.service';

@Injectable()
export class ScheduleService {
  constructor(
    @InjectModel(Patient.name) private patientModel: Model<Patient>,
    @InjectModel(Invoice.name) private invoiceModel: Model<Invoice>,
    private readonly calendarService: GoogleCalendarService,
  ) {}

  async getSchedule(userId: string, clinicId: string, date: string) {
    // Build time range for the given date (00:00 to 23:59)
    const dayStart = new Date(`${date}T00:00:00`);
    const dayEnd = new Date(`${date}T23:59:59`);

    // Fetch calendar events
    let events: any[];
    try {
      events = await this.calendarService.listEvents(userId, {
        timeMin: dayStart.toISOString(),
        timeMax: dayEnd.toISOString(),
        maxResults: 50,
      });
    } catch (error) {
      if (error.status === 400 || error.message?.includes('not connected')) {
        throw new BadRequestException(
          'Google Calendar not connected. Log in with Google to see scheduled patients.',
        );
      }
      throw error;
    }

    // Enrich each event with patient data
    const appointments = await Promise.all(
      (events || []).map(async (event: any) => {
        const appointment: any = {
          calendarEventId: event.id,
          summary: event.summary || '',
          startTime: event.start?.dateTime || event.start?.date || '',
          endTime: event.end?.dateTime || event.end?.date || '',
          patient: null,
          matched: false,
        };

        // Try to match patient
        const patientId = this.extractPatientId(event.description);
        let patient: Patient | null = null;

        if (patientId) {
          patient = await this.patientModel.findOne({
            _id: patientId,
            clinicId,
            isActive: true,
          });
        }

        if (!patient && event.summary) {
          // Fuzzy match by name from event summary
          const namePart =
            event.summary.split('\u2014')[0]?.trim() ||
            event.summary.split('-')[0]?.trim();
          if (namePart) {
            const nameParts = namePart.trim().split(/\s+/);
            if (nameParts.length >= 2) {
              patient = await this.patientModel.findOne({
                clinicId,
                isActive: true,
                firstName: { $regex: new RegExp(nameParts[0], 'i') },
                lastName: {
                  $regex: new RegExp(nameParts[nameParts.length - 1], 'i'),
                },
              });
            }
          }
        }

        if (patient) {
          // Get last visit (most recent invoice)
          const lastInvoice: any = await this.invoiceModel
            .findOne({
              clinicId,
              'receiver.identificationNumber': patient.identificationNumber,
            })
            .sort({ createdAt: -1 })
            .select('createdAt')
            .lean();

          // Get pending payment
          const pendingInvoice: any = await this.invoiceModel
            .findOne({
              clinicId,
              'receiver.identificationNumber': patient.identificationNumber,
              saleCondition: '02',
              haciendaStatus: 'accepted',
              paymentStatus: { $ne: 'paid' },
            })
            .select('_id summary.totalVoucher createdAt creditTermDays')
            .lean();

          let pendingPayment: {
            hasPending: boolean;
            amount: number;
            invoiceId: any;
            dueDate: Date | null;
          } = {
            hasPending: false,
            amount: 0,
            invoiceId: null,
            dueDate: null,
          };

          if (pendingInvoice) {
            const dueDate = new Date(pendingInvoice.createdAt);
            dueDate.setDate(
              dueDate.getDate() + (pendingInvoice.creditTermDays || 30),
            );
            pendingPayment = {
              hasPending: true,
              amount: pendingInvoice.summary?.totalVoucher || 0,
              invoiceId: pendingInvoice._id,
              dueDate,
            };
          }

          appointment.patient = {
            id: patient._id,
            name: `${patient.firstName} ${patient.lastName}`,
            identificationType: patient.identificationType,
            identificationNumber: patient.identificationNumber,
            phone: patient.phone?.number
              ? `+${patient.phone.countryCode || '506'}${patient.phone.number}`
              : null,
            email: patient.email,
            lastVisit: lastInvoice?.createdAt || null,
            pendingPayment,
          };
          appointment.matched = true;
        }

        return appointment;
      }),
    );

    return { date, appointments };
  }

  async getToday(userId: string, clinicId: string) {
    const today = new Date().toISOString().split('T')[0];
    return this.getSchedule(userId, clinicId, today);
  }

  async getTomorrow(userId: string, clinicId: string) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    return this.getSchedule(userId, clinicId, dateStr);
  }

  private extractPatientId(description: string | undefined): string | null {
    if (!description) return null;
    const match = description.match(/patientId:([a-f0-9]{24})/i);
    return match ? match[1] : null;
  }
}
