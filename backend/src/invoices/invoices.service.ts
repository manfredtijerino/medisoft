import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Invoice } from './schemas/invoice.schema';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { CreateNoteDto } from './dto/create-note.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PatientsService } from '../patients/patients.service';
import { ProductsService } from '../products/products.service';
import { ClinicSettingsService } from '../clinic-settings/clinic-settings.service';
import { HaciendaService } from '../hacienda/hacienda.service';
import { HaciendaKeyService } from '../hacienda/hacienda-key.service';
import {
  HaciendaXmlService,
  InvoiceData,
  InvoiceLineItem,
  InvoiceReceiver,
  DocumentReference,
} from '../hacienda/hacienda-xml.service';
import { EncryptionUtil } from '../common/utils/encryption.util';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    @InjectModel(Invoice.name)
    private invoiceModel: Model<Invoice>,
    private readonly patientsService: PatientsService,
    private readonly productsService: ProductsService,
    private readonly clinicSettingsService: ClinicSettingsService,
    private readonly haciendaService: HaciendaService,
    private readonly haciendaKeyService: HaciendaKeyService,
    private readonly haciendaXmlService: HaciendaXmlService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Create an invoice following the 10-step flow.
   */
  async create(clinicId: string, dto: CreateInvoiceDto): Promise<Invoice> {
    const settings = await this.clinicSettingsService.findByClinicId(clinicId);

    // Step 2: Build receiver from patient if provided
    let receiver: InvoiceReceiver | undefined;
    if (dto.patientId) {
      const patient = await this.patientsService.findOne(clinicId, dto.patientId);
      receiver = {
        name: `${patient.firstName} ${patient.lastName}`,
        identificationType: patient.identificationType,
        identificationNumber: patient.identificationNumber,
        email: patient.email || undefined,
        phone: patient.phone?.number
          ? { countryCode: patient.phone.countryCode || '506', number: patient.phone.number }
          : undefined,
        location: patient.address?.province
          ? {
              province: patient.address.province,
              canton: patient.address.canton,
              district: patient.address.district,
              otherSigns: patient.address.otherSigns || 'N/A',
            }
          : undefined,
      };
    }

    // Step 3 & 4: Look up products and build line items
    const lines: InvoiceLineItem[] = [];
    const invoiceItems: any[] = [];

    let totalTaxableServices = 0;
    let totalExemptServices = 0;
    let totalTaxableGoods = 0;
    let totalExemptGoods = 0;
    let totalTax = 0;
    let totalDiscount = 0;

    for (let i = 0; i < dto.items.length; i++) {
      const item = dto.items[i];
      const product = await this.productsService.findOne(clinicId, item.productId);

      const lineNumber = i + 1;
      const unitPrice = product.price;
      const subtotal = unitPrice * item.quantity;

      // Calculate discounts
      const discounts = item.discounts || [];
      const discountTotal = discounts.reduce((sum, d) => sum + d.amount, 0);
      const netTotal = subtotal - discountTotal;

      // Calculate tax
      const taxRate = product.tax?.rate || 0;
      const taxAmount = netTotal * (taxRate / 100);
      const lineTotal = netTotal + taxAmount;

      const isService = product.type === 'service';
      const isExempt = taxRate === 0;

      if (isService) {
        if (isExempt) {
          totalExemptServices += netTotal;
        } else {
          totalTaxableServices += netTotal;
        }
      } else {
        if (isExempt) {
          totalExemptGoods += netTotal;
        } else {
          totalTaxableGoods += netTotal;
        }
      }

      totalTax += taxAmount;
      totalDiscount += discountTotal;

      // Build the InvoiceLineItem for XML
      const lineItem: InvoiceLineItem = {
        lineNumber,
        cabysCode: product.cabysCode,
        commercialCode: product.productCode || undefined,
        quantity: item.quantity,
        unitOfMeasure: product.unitOfMeasure,
        description: product.name,
        unitPrice,
        totalAmount: subtotal,
        discount:
          discountTotal > 0
            ? { amount: discountTotal, reason: discounts[0]?.reason || 'Descuento' }
            : undefined,
        subTotal: netTotal,
        tax:
          taxRate > 0
            ? {
                code: product.tax.code,
                rateCode: product.tax.rateCode,
                rate: taxRate,
                amount: taxAmount,
              }
            : undefined,
        lineTotalAmount: lineTotal,
      };

      lines.push(lineItem);

      // Build the stored invoice item
      invoiceItems.push({
        lineNumber,
        productId: product._id,
        cabysCode: product.cabysCode,
        productCode: product.productCode || '',
        description: product.name,
        quantity: item.quantity,
        unitOfMeasure: product.unitOfMeasure,
        unitPrice,
        subtotal,
        discounts,
        discountTotal,
        netTotal,
        tax:
          taxRate > 0
            ? {
                code: product.tax.code,
                rateCode: product.tax.rateCode,
                rate: taxRate,
                amount: taxAmount,
              }
            : undefined,
        lineTotal,
      });
    }

    // Step 5: Calculate summary
    const totalTaxable = totalTaxableServices + totalTaxableGoods;
    const totalExempt = totalExemptServices + totalExemptGoods;
    const totalSales = totalTaxable + totalExempt;
    const totalNetSales = totalSales - totalDiscount;
    const totalVoucher = totalNetSales + totalTax;

    const summary = {
      totalTaxableServices,
      totalExemptServices,
      totalTaxableGoods,
      totalExemptGoods,
      totalTax,
      totalDiscount,
      totalNetSale: totalNetSales,
      totalVoucher,
    };

    // Step 6: Validate payment totals
    const paymentTotal = dto.paymentMethods.reduce((sum, p) => sum + p.amount, 0);
    if (Math.abs(paymentTotal - totalVoucher) > 0.01) {
      throw new BadRequestException(
        `Payment total (${paymentTotal}) does not match invoice total (${totalVoucher})`,
      );
    }

    // Step 7: Generate consecutivo and clave
    const issueDate = new Date();
    const consecutivo = await this.haciendaKeyService.generateConsecutivo(
      clinicId,
      dto.documentType,
    );
    const clave = this.haciendaKeyService.generateClave({
      date: issueDate,
      issuerCedula: settings.identificationNumber,
      consecutivo,
      situation: '1',
    });

    // Step 8: Build XML
    const invoiceData: InvoiceData = {
      clave,
      activityCode: settings.economicActivityCode,
      consecutivo,
      issueDate,
      receiver,
      saleCondition: dto.saleCondition,
      creditTerm: dto.creditTermDays ? `${dto.creditTermDays}` : undefined,
      paymentMethod: dto.paymentMethods[0]?.code || '01',
      lines,
      summary: {
        totalTaxableServices,
        totalExemptServices,
        totalTaxableGoods,
        totalExemptGoods,
        totalTaxable,
        totalExempt,
        totalSales,
        totalDiscounts: totalDiscount,
        totalNetSales,
        totalTax,
        totalVoucher,
      },
    };

    const xml = this.haciendaXmlService.buildInvoiceXml(invoiceData, settings);

    // Step 9: Sign XML
    const encryptionKey = this.configService.get<string>('ENCRYPTION_KEY', '');
    const p12Pin = EncryptionUtil.decrypt(settings.hacienda.cryptoKeyPin, encryptionKey);
    const signedXml = this.haciendaXmlService.signXml(
      xml,
      settings.hacienda.cryptoKeyP12,
      p12Pin,
    );
    const signedXmlBase64 = Buffer.from(signedXml).toString('base64');

    // Build issuer info
    const issuer = {
      name: settings.businessName,
      identificationType: settings.identificationType,
      identificationNumber: settings.identificationNumber,
      email: settings.email,
      phone: settings.phone?.number || '',
    };

    // Save invoice
    const invoice = new this.invoiceModel({
      clinicId,
      documentType: dto.documentType,
      clave,
      consecutivo,
      issuer,
      receiver: dto.patientId
        ? {
            name: receiver!.name,
            identificationType: receiver!.identificationType,
            identificationNumber: receiver!.identificationNumber,
            email: receiver!.email || '',
            phone: receiver!.phone?.number || '',
          }
        : undefined,
      saleCondition: dto.saleCondition,
      creditTermDays: dto.creditTermDays,
      paymentMethods: dto.paymentMethods,
      currency: dto.currency || 'CRC',
      items: invoiceItems,
      summary,
      signedXml: signedXmlBase64,
      notes: dto.notes,
      paymentStatus: dto.saleCondition === '02' ? 'pending' : 'paid',
    });

    const saved = await invoice.save();

    // Step 10: Submit to Hacienda if requested
    if (dto.sendToHacienda) {
      await this.submitToHacienda(clinicId, saved, signedXmlBase64, settings);
    }

    return saved;
  }

  /**
   * List invoices with pagination and optional status filter.
   */
  async findAll(
    clinicId: string,
    paginationDto: PaginationDto,
    status?: string,
  ) {
    const page = paginationDto.page ?? 1;
    const limit = paginationDto.limit ?? 20;
    const skip = (page - 1) * limit;

    const filter: any = { clinicId, isArchived: { $ne: true } };
    if (status) {
      filter.haciendaStatus = status;
    }
    if (paginationDto.search) {
      filter.$or = [
        { clave: { $regex: paginationDto.search, $options: 'i' } },
        { consecutivo: { $regex: paginationDto.search, $options: 'i' } },
        { 'receiver.name': { $regex: paginationDto.search, $options: 'i' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.invoiceModel
        .find(filter)
        .select('-signedXml')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.invoiceModel.countDocuments(filter),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single invoice by ID.
   */
  async findOne(clinicId: string, id: string): Promise<Invoice> {
    const invoice = await this.invoiceModel
      .findOne({ _id: id, clinicId })
      .lean()
      .exec();

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice as Invoice;
  }

  /**
   * Send or resend an invoice to Hacienda.
   */
  async sendToHacienda(clinicId: string, id: string): Promise<Invoice> {
    const invoice = await this.findOne(clinicId, id);
    const settings = await this.clinicSettingsService.findByClinicId(clinicId);

    if (!invoice.signedXml) {
      throw new BadRequestException('Invoice has no signed XML');
    }

    await this.submitToHacienda(clinicId, invoice, invoice.signedXml, settings);

    return this.findOne(clinicId, id);
  }

  /**
   * Check Hacienda status for an invoice.
   */
  async checkStatus(clinicId: string, id: string): Promise<Invoice> {
    const invoice = await this.findOne(clinicId, id);

    try {
      const response = await this.haciendaService.checkDocumentStatus(
        clinicId,
        invoice.clave,
      );

      const newStatus = this.mapHaciendaStatus(response);

      await this.invoiceModel.findByIdAndUpdate(invoice._id, {
        $set: {
          haciendaStatus: newStatus,
          haciendaResponse: response,
        },
      });

      return this.findOne(clinicId, id);
    } catch (error) {
      this.logger.error(`Failed to check status for invoice ${id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get the signed XML for download.
   */
  async getXml(clinicId: string, id: string): Promise<string> {
    const invoice = await this.findOne(clinicId, id);

    if (!invoice.signedXml) {
      throw new NotFoundException('No signed XML found for this invoice');
    }

    return invoice.signedXml;
  }

  /**
   * Create a credit note (documentType '03') referencing an existing invoice.
   */
  async createCreditNote(
    clinicId: string,
    invoiceId: string,
    dto: CreateNoteDto,
  ): Promise<Invoice> {
    return this.createNote(clinicId, invoiceId, dto, '03');
  }

  /**
   * Create a debit note (documentType '02') referencing an existing invoice.
   */
  async createDebitNote(
    clinicId: string,
    invoiceId: string,
    dto: CreateNoteDto,
  ): Promise<Invoice> {
    return this.createNote(clinicId, invoiceId, dto, '02');
  }

  /**
   * Handle webhook callback from Hacienda.
   */
  async handleWebhook(body: any): Promise<{ message: string }> {
    const clave = body?.clave;
    if (!clave) {
      throw new BadRequestException('Missing clave in webhook body');
    }

    const invoice = await this.invoiceModel.findOne({ clave }).exec();
    if (!invoice) {
      this.logger.warn(`Webhook received for unknown clave: ${clave}`);
      return { message: 'Invoice not found' };
    }

    const newStatus = this.mapHaciendaStatus(body);

    await this.invoiceModel.findByIdAndUpdate(invoice._id, {
      $set: {
        haciendaStatus: newStatus,
        haciendaResponse: body,
      },
    });

    this.logger.log(`Webhook updated invoice ${invoice._id} to status: ${newStatus}`);
    return { message: `Invoice updated to ${newStatus}` };
  }

  /**
   * Poll for invoices stuck in 'sent' status for more than 5 minutes.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async pollStuckInvoices(): Promise<void> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const stuckInvoices = await this.invoiceModel
      .find({
        haciendaStatus: 'sent',
        sentAt: { $lte: fiveMinutesAgo },
      })
      .limit(50)
      .exec();

    if (stuckInvoices.length === 0) return;

    this.logger.log(`Polling ${stuckInvoices.length} stuck invoices`);

    for (const invoice of stuckInvoices) {
      try {
        const response = await this.haciendaService.checkDocumentStatus(
          invoice.clinicId.toString(),
          invoice.clave,
        );

        const newStatus = this.mapHaciendaStatus(response);

        await this.invoiceModel.findByIdAndUpdate(invoice._id, {
          $set: {
            haciendaStatus: newStatus,
            haciendaResponse: response,
          },
        });

        this.logger.log(`Polled invoice ${invoice._id}: ${newStatus}`);
      } catch (error) {
        this.logger.error(
          `Failed to poll invoice ${invoice._id}: ${error.message}`,
        );
      }
    }
  }

  private async createNote(
    clinicId: string,
    invoiceId: string,
    dto: CreateNoteDto,
    documentType: '02' | '03',
  ): Promise<Invoice> {
    const originalInvoice = await this.findOne(clinicId, invoiceId);

    if (originalInvoice.haciendaStatus !== 'accepted') {
      throw new BadRequestException(
        'Can only create notes for accepted invoices',
      );
    }

    const settings = await this.clinicSettingsService.findByClinicId(clinicId);

    // Build line items from dto.items
    const lines: InvoiceLineItem[] = [];
    const invoiceItems: any[] = [];

    let totalTaxableServices = 0;
    let totalExemptServices = 0;
    let totalTaxableGoods = 0;
    let totalExemptGoods = 0;
    let totalTax = 0;
    let totalDiscount = 0;

    for (let i = 0; i < dto.items.length; i++) {
      const item = dto.items[i];
      const product = await this.productsService.findOne(clinicId, item.productId);

      const lineNumber = i + 1;
      const unitPrice = product.price;
      const subtotal = unitPrice * item.quantity;
      const discounts = item.discounts || [];
      const discountTotal = discounts.reduce((sum, d) => sum + d.amount, 0);
      const netTotal = subtotal - discountTotal;
      const taxRate = product.tax?.rate || 0;
      const taxAmount = netTotal * (taxRate / 100);
      const lineTotal = netTotal + taxAmount;

      const isService = product.type === 'service';
      const isExempt = taxRate === 0;

      if (isService) {
        if (isExempt) totalExemptServices += netTotal;
        else totalTaxableServices += netTotal;
      } else {
        if (isExempt) totalExemptGoods += netTotal;
        else totalTaxableGoods += netTotal;
      }

      totalTax += taxAmount;
      totalDiscount += discountTotal;

      lines.push({
        lineNumber,
        cabysCode: product.cabysCode,
        commercialCode: product.productCode || undefined,
        quantity: item.quantity,
        unitOfMeasure: product.unitOfMeasure,
        description: product.name,
        unitPrice,
        totalAmount: subtotal,
        discount:
          discountTotal > 0
            ? { amount: discountTotal, reason: discounts[0]?.reason || 'Descuento' }
            : undefined,
        subTotal: netTotal,
        tax:
          taxRate > 0
            ? { code: product.tax.code, rateCode: product.tax.rateCode, rate: taxRate, amount: taxAmount }
            : undefined,
        lineTotalAmount: lineTotal,
      });

      invoiceItems.push({
        lineNumber,
        productId: product._id,
        cabysCode: product.cabysCode,
        productCode: product.productCode || '',
        description: product.name,
        quantity: item.quantity,
        unitOfMeasure: product.unitOfMeasure,
        unitPrice,
        subtotal,
        discounts,
        discountTotal,
        netTotal,
        tax:
          taxRate > 0
            ? { code: product.tax.code, rateCode: product.tax.rateCode, rate: taxRate, amount: taxAmount }
            : undefined,
        lineTotal,
      });
    }

    const totalTaxable = totalTaxableServices + totalTaxableGoods;
    const totalExempt = totalExemptServices + totalExemptGoods;
    const totalSales = totalTaxable + totalExempt;
    const totalNetSales = totalSales - totalDiscount;
    const totalVoucher = totalNetSales + totalTax;

    // Generate consecutivo and clave
    const issueDate = new Date();
    const consecutivo = await this.haciendaKeyService.generateConsecutivo(
      clinicId,
      documentType,
    );
    const clave = this.haciendaKeyService.generateClave({
      date: issueDate,
      issuerCedula: settings.identificationNumber,
      consecutivo,
      situation: '1',
    });

    // Build reference
    const reference: DocumentReference = {
      documentType: originalInvoice.documentType,
      referenceNumber: originalInvoice.clave,
      issueDate: (originalInvoice as any).createdAt
        ? new Date((originalInvoice as any).createdAt).toISOString()
        : issueDate.toISOString(),
      referenceCode: dto.referenceCode,
      reason: dto.reason,
    };

    // Build receiver from original invoice
    let receiver: InvoiceReceiver | undefined;
    if (originalInvoice.receiver) {
      receiver = {
        name: originalInvoice.receiver.name,
        identificationType: originalInvoice.receiver.identificationType,
        identificationNumber: originalInvoice.receiver.identificationNumber,
        email: originalInvoice.receiver.email || undefined,
        phone: originalInvoice.receiver.phone
          ? { countryCode: '506', number: originalInvoice.receiver.phone }
          : undefined,
      };
    }

    const invoiceData: InvoiceData = {
      clave,
      activityCode: settings.economicActivityCode,
      consecutivo,
      issueDate,
      receiver,
      saleCondition: originalInvoice.saleCondition,
      creditTerm: originalInvoice.creditTermDays
        ? `${originalInvoice.creditTermDays}`
        : undefined,
      paymentMethod: originalInvoice.paymentMethods?.[0]?.code || '01',
      lines,
      summary: {
        totalTaxableServices,
        totalExemptServices,
        totalTaxableGoods,
        totalExemptGoods,
        totalTaxable,
        totalExempt,
        totalSales,
        totalDiscounts: totalDiscount,
        totalNetSales,
        totalTax,
        totalVoucher,
      },
    };

    // Build XML based on note type
    const xml =
      documentType === '03'
        ? this.haciendaXmlService.buildCreditNoteXml(invoiceData, reference, settings)
        : this.haciendaXmlService.buildDebitNoteXml(invoiceData, reference, settings);

    // Sign XML
    const encryptionKey = this.configService.get<string>('ENCRYPTION_KEY', '');
    const p12Pin = EncryptionUtil.decrypt(settings.hacienda.cryptoKeyPin, encryptionKey);
    const signedXml = this.haciendaXmlService.signXml(
      xml,
      settings.hacienda.cryptoKeyP12,
      p12Pin,
    );
    const signedXmlBase64 = Buffer.from(signedXml).toString('base64');

    const issuer = {
      name: settings.businessName,
      identificationType: settings.identificationType,
      identificationNumber: settings.identificationNumber,
      email: settings.email,
      phone: settings.phone?.number || '',
    };

    const invoice = new this.invoiceModel({
      clinicId,
      documentType,
      clave,
      consecutivo,
      issuer,
      receiver: originalInvoice.receiver,
      saleCondition: originalInvoice.saleCondition,
      creditTermDays: originalInvoice.creditTermDays,
      paymentMethods: originalInvoice.paymentMethods,
      currency: originalInvoice.currency || 'CRC',
      items: invoiceItems,
      summary: {
        totalTaxableServices,
        totalExemptServices,
        totalTaxableGoods,
        totalExemptGoods,
        totalTax,
        totalDiscount,
        totalNetSale: totalNetSales,
        totalVoucher,
      },
      references: [
        {
          documentType: originalInvoice.documentType,
          clave: originalInvoice.clave,
          date: (originalInvoice as any).createdAt || issueDate,
          code: dto.referenceCode,
          reason: dto.reason,
        },
      ],
      signedXml: signedXmlBase64,
    });

    const saved = await invoice.save();

    if (dto.sendToHacienda) {
      await this.submitToHacienda(clinicId, saved, signedXmlBase64, settings);
    }

    return saved;
  }

  private async submitToHacienda(
    clinicId: string,
    invoice: Invoice,
    signedXmlBase64: string,
    settings: any,
  ): Promise<void> {
    try {
      const document = {
        clave: invoice.clave,
        fecha: new Date().toISOString(),
        emisor: {
          tipoIdentificacion: settings.identificationType,
          numeroIdentificacion: settings.identificationNumber,
        },
        receptor: invoice.receiver
          ? {
              tipoIdentificacion: invoice.receiver.identificationType,
              numeroIdentificacion: invoice.receiver.identificationNumber,
            }
          : undefined,
        comprobanteXml: signedXmlBase64,
      };

      await this.haciendaService.submitDocument(clinicId, document);

      await this.invoiceModel.findByIdAndUpdate(invoice._id, {
        $set: {
          haciendaStatus: 'sent',
          sentAt: new Date(),
        },
      });

      this.logger.log(`Invoice ${invoice._id} sent to Hacienda`);
    } catch (error) {
      this.logger.error(
        `Failed to send invoice ${invoice._id} to Hacienda: ${error.message}`,
      );
      throw new BadRequestException(
        `Failed to send to Hacienda: ${error.message}`,
      );
    }
  }

  async updateNotes(clinicId: string, id: string, notes: string) {
    const invoice = await this.invoiceModel.findOneAndUpdate(
      { _id: id, clinicId },
      { $set: { notes } },
      { new: true },
    );
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async archiveInvoice(clinicId: string, id: string) {
    const invoice = await this.invoiceModel.findOneAndUpdate(
      { _id: id, clinicId },
      { $set: { isArchived: true } },
      { new: true },
    );
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async unarchiveInvoice(clinicId: string, id: string) {
    const invoice = await this.invoiceModel.findOneAndUpdate(
      { _id: id, clinicId },
      { $set: { isArchived: false } },
      { new: true },
    );
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  // ---------- Private helpers ----------

  private mapHaciendaStatus(response: any): string {
    const indEstado = response?.['ind-estado'] || response?.indEstado || '';
    if (indEstado === 'aceptado' || indEstado === '1') return 'accepted';
    if (indEstado === 'rechazado' || indEstado === '2') return 'rejected';
    return 'sent';
  }
}
