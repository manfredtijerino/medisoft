import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Invoice } from '../invoices/schemas/invoice.schema';
import { Patient } from '../patients/schemas/patient.schema';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Invoice.name) private invoiceModel: Model<Invoice>,
    @InjectModel(Patient.name) private patientModel: Model<Patient>,
  ) {}

  async getSales(clinicId: string, query: AnalyticsQueryDto) {
    const { start, end } = this.getDateRange(query);
    const clinicObjectId = new Types.ObjectId(clinicId);

    const matchStage = {
      clinicId: clinicObjectId,
      createdAt: { $gte: start, $lte: end },
      haciendaStatus: { $ne: 'rejected' },
    };

    const [totals, salesByDay, salesByPaymentMethod, haciendaStatusBreakdown] =
      await Promise.all([
        // Totals
        this.invoiceModel.aggregate([
          { $match: matchStage },
          {
            $group: {
              _id: null,
              totalSales: { $sum: '$summary.totalVoucher' },
              totalTax: { $sum: '$summary.totalTax' },
              totalInvoices: { $sum: 1 },
            },
          },
        ]),

        // Sales by day
        this.invoiceModel.aggregate([
          { $match: matchStage },
          {
            $group: {
              _id: {
                $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
              },
              total: { $sum: '$summary.totalVoucher' },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),

        // Sales by payment method
        this.invoiceModel.aggregate([
          { $match: matchStage },
          { $unwind: '$paymentMethods' },
          {
            $group: {
              _id: '$paymentMethods.code',
              total: { $sum: '$paymentMethods.amount' },
              count: { $sum: 1 },
            },
          },
          { $sort: { total: -1 } },
        ]),

        // Hacienda status breakdown
        this.invoiceModel.aggregate([
          {
            $match: {
              clinicId: clinicObjectId,
              createdAt: { $gte: start, $lte: end },
            },
          },
          {
            $group: {
              _id: '$haciendaStatus',
              count: { $sum: 1 },
            },
          },
        ]),
      ]);

    const totalData = totals[0] || {
      totalSales: 0,
      totalTax: 0,
      totalInvoices: 0,
    };

    return {
      totalSales: totalData.totalSales,
      totalInvoices: totalData.totalInvoices,
      totalTax: totalData.totalTax,
      averageInvoiceAmount:
        totalData.totalInvoices > 0
          ? totalData.totalSales / totalData.totalInvoices
          : 0,
      salesByDay,
      salesByPaymentMethod,
      haciendaStatusBreakdown,
    };
  }

  async getPatients(clinicId: string, query: AnalyticsQueryDto) {
    const { start, end } = this.getDateRange(query);
    const clinicObjectId = new Types.ObjectId(clinicId);

    const [totalPatients, newPatients, returningPatients, patientsByMonth] =
      await Promise.all([
        // Total active patients
        this.patientModel.countDocuments({
          clinicId: clinicObjectId,
          isActive: true,
        }),

        // New patients within range
        this.patientModel.countDocuments({
          clinicId: clinicObjectId,
          isActive: true,
          createdAt: { $gte: start, $lte: end },
        }),

        // Returning patients: distinct receivers in invoices within range
        // whose patient record was created before the range start
        this.invoiceModel.aggregate([
          {
            $match: {
              clinicId: clinicObjectId,
              createdAt: { $gte: start, $lte: end },
              haciendaStatus: { $ne: 'rejected' },
            },
          },
          {
            $group: {
              _id: '$receiver.identificationNumber',
            },
          },
          {
            $lookup: {
              from: 'patients',
              let: { idNumber: '$_id' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: ['$clinicId', clinicObjectId] },
                        { $eq: ['$identificationNumber', '$$idNumber'] },
                        { $lt: ['$createdAt', start] },
                      ],
                    },
                  },
                },
              ],
              as: 'existingPatient',
            },
          },
          {
            $match: { 'existingPatient.0': { $exists: true } },
          },
          {
            $count: 'count',
          },
        ]),

        // New patients by month
        this.patientModel.aggregate([
          {
            $match: {
              clinicId: clinicObjectId,
              isActive: true,
              createdAt: { $gte: start, $lte: end },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: '%Y-%m', date: '$createdAt' },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
      ]);

    return {
      totalPatients,
      newPatients,
      returningPatients: returningPatients[0]?.count || 0,
      patientsByMonth,
    };
  }

  async getTopProducts(
    clinicId: string,
    query: AnalyticsQueryDto,
    limit: number,
  ) {
    const { start, end } = this.getDateRange(query);
    const clinicObjectId = new Types.ObjectId(clinicId);

    const matchStage = {
      clinicId: clinicObjectId,
      createdAt: { $gte: start, $lte: end },
      haciendaStatus: { $ne: 'rejected' },
    };

    const [topByRevenue, topByQuantity] = await Promise.all([
      this.invoiceModel.aggregate([
        { $match: matchStage },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.productId',
            description: { $first: '$items.description' },
            totalRevenue: { $sum: '$items.lineTotal' },
            totalQuantity: { $sum: '$items.quantity' },
          },
        },
        { $sort: { totalRevenue: -1 } },
        { $limit: limit },
      ]),

      this.invoiceModel.aggregate([
        { $match: matchStage },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.productId',
            description: { $first: '$items.description' },
            totalRevenue: { $sum: '$items.lineTotal' },
            totalQuantity: { $sum: '$items.quantity' },
          },
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: limit },
      ]),
    ]);

    return { topByRevenue, topByQuantity };
  }

  async getTopPatients(
    clinicId: string,
    query: AnalyticsQueryDto,
    limit: number,
  ) {
    const { start, end } = this.getDateRange(query);
    const clinicObjectId = new Types.ObjectId(clinicId);

    const matchStage = {
      clinicId: clinicObjectId,
      createdAt: { $gte: start, $lte: end },
      haciendaStatus: { $ne: 'rejected' },
    };

    const [byVisits, bySpending] = await Promise.all([
      this.invoiceModel.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$receiver.identificationNumber',
            name: { $first: '$receiver.name' },
            visits: { $sum: 1 },
            totalSpending: { $sum: '$summary.totalVoucher' },
          },
        },
        { $sort: { visits: -1 } },
        { $limit: limit },
      ]),

      this.invoiceModel.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$receiver.identificationNumber',
            name: { $first: '$receiver.name' },
            visits: { $sum: 1 },
            totalSpending: { $sum: '$summary.totalVoucher' },
          },
        },
        { $sort: { totalSpending: -1 } },
        { $limit: limit },
      ]),
    ]);

    return { byVisits, bySpending };
  }

  async getSummary(clinicId: string, query: AnalyticsQueryDto) {
    const limit = parseInt(query.limit || '10');

    const [sales, patients, topProducts, topPatients] = await Promise.all([
      this.getSales(clinicId, query),
      this.getPatients(clinicId, query),
      this.getTopProducts(clinicId, query, limit),
      this.getTopPatients(clinicId, query, limit),
    ]);

    return { sales, patients, topProducts, topPatients };
  }

  private getDateRange(query: AnalyticsQueryDto): { start: Date; end: Date } {
    const now = new Date();
    const end = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999,
    );
    let start: Date;

    switch (query.range) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'thisWeek': {
        const dayOfWeek = now.getDay();
        const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        start = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - mondayOffset,
        );
        break;
      }
      case 'lastWeek': {
        const currentDay = now.getDay();
        const lastMondayOffset = currentDay === 0 ? 13 : currentDay + 6;
        start = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - lastMondayOffset,
        );
        const lastSunday = new Date(start);
        lastSunday.setDate(lastSunday.getDate() + 6);
        lastSunday.setHours(23, 59, 59, 999);
        return { start, end: lastSunday };
      }
      case 'last3months':
        start = new Date(
          now.getFullYear(),
          now.getMonth() - 3,
          now.getDate(),
        );
        break;
      case 'last6months':
        start = new Date(
          now.getFullYear(),
          now.getMonth() - 6,
          now.getDate(),
        );
        break;
      case 'last12months':
        start = new Date(
          now.getFullYear() - 1,
          now.getMonth(),
          now.getDate(),
        );
        break;
      case 'custom':
        if (!query.startDate || !query.endDate) {
          throw new BadRequestException(
            'Custom range requires startDate and endDate',
          );
        }
        start = new Date(query.startDate);
        return { start, end: new Date(query.endDate) };
      default: // last30days
        start = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 30,
        );
        break;
    }
    return { start, end };
  }
}
