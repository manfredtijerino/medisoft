import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { InvoicesService } from './invoices.service';
import { InvoicePdfService } from './invoice-pdf.service';
import { InvoiceEmailService } from './invoice-email.service';
import { InvoiceWhatsappService } from './invoice-whatsapp.service';
import { ClinicSettingsService } from '../clinic-settings/clinic-settings.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { CreateNoteDto } from './dto/create-note.dto';
import { SendInvoiceEmailDto } from './dto/send-invoice-email.dto';
import { SendInvoiceWhatsappDto } from './dto/send-invoice-whatsapp.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Clinic } from '../auth/decorators/clinic.decorator';
import { MongoIdValidationPipe } from '../common/pipes/mongo-id-validation.pipe';

@Controller('invoices')
export class InvoicesController {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly invoicePdfService: InvoicePdfService,
    private readonly invoiceEmailService: InvoiceEmailService,
    private readonly invoiceWhatsappService: InvoiceWhatsappService,
    private readonly clinicSettingsService: ClinicSettingsService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Clinic() clinicId: string,
    @Body() dto: CreateInvoiceDto,
  ) {
    return this.invoicesService.create(clinicId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(
    @Clinic() clinicId: string,
    @Query() paginationDto: PaginationDto,
    @Query('status') status?: string,
  ) {
    return this.invoicesService.findAll(clinicId, paginationDto, status);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(
    @Clinic() clinicId: string,
    @Param('id', MongoIdValidationPipe) id: string,
  ) {
    return this.invoicesService.findOne(clinicId, id);
  }

  @Post(':id/send')
  @UseGuards(JwtAuthGuard)
  sendToHacienda(
    @Clinic() clinicId: string,
    @Param('id', MongoIdValidationPipe) id: string,
  ) {
    return this.invoicesService.sendToHacienda(clinicId, id);
  }

  @Get(':id/status')
  @UseGuards(JwtAuthGuard)
  checkStatus(
    @Clinic() clinicId: string,
    @Param('id', MongoIdValidationPipe) id: string,
  ) {
    return this.invoicesService.checkStatus(clinicId, id);
  }

  @Get(':id/xml')
  @UseGuards(JwtAuthGuard)
  async getXml(
    @Clinic() clinicId: string,
    @Param('id', MongoIdValidationPipe) id: string,
    @Res() res: Response,
  ) {
    const xmlBase64 = await this.invoicesService.getXml(clinicId, id);
    const xmlBuffer = Buffer.from(xmlBase64, 'base64');

    res.set({
      'Content-Type': 'application/xml',
      'Content-Disposition': `attachment; filename="invoice-${id}.xml"`,
    });

    res.send(xmlBuffer);
  }

  @Post(':id/credit-note')
  @UseGuards(JwtAuthGuard)
  createCreditNote(
    @Clinic() clinicId: string,
    @Param('id', MongoIdValidationPipe) id: string,
    @Body() dto: CreateNoteDto,
  ) {
    return this.invoicesService.createCreditNote(clinicId, id, dto);
  }

  @Post(':id/debit-note')
  @UseGuards(JwtAuthGuard)
  createDebitNote(
    @Clinic() clinicId: string,
    @Param('id', MongoIdValidationPipe) id: string,
    @Body() dto: CreateNoteDto,
  ) {
    return this.invoicesService.createDebitNote(clinicId, id, dto);
  }

  @Patch(':id/notes')
  @UseGuards(JwtAuthGuard)
  updateNotes(
    @Clinic() clinicId: string,
    @Param('id', MongoIdValidationPipe) id: string,
    @Body('notes') notes: string,
  ) {
    return this.invoicesService.updateNotes(clinicId, id, notes);
  }

  @Patch(':id/archive')
  @UseGuards(JwtAuthGuard)
  archiveInvoice(
    @Clinic() clinicId: string,
    @Param('id', MongoIdValidationPipe) id: string,
  ) {
    return this.invoicesService.archiveInvoice(clinicId, id);
  }

  @Patch(':id/unarchive')
  @UseGuards(JwtAuthGuard)
  unarchiveInvoice(
    @Clinic() clinicId: string,
    @Param('id', MongoIdValidationPipe) id: string,
  ) {
    return this.invoicesService.unarchiveInvoice(clinicId, id);
  }

  @Post('webhook')
  handleWebhook(@Body() body: any) {
    return this.invoicesService.handleWebhook(body);
  }

  @Get(':id/pdf')
  @UseGuards(JwtAuthGuard)
  async downloadPdf(
    @Clinic() clinicId: string,
    @Param('id', MongoIdValidationPipe) id: string,
    @Res() res: Response,
  ) {
    const invoice = await this.invoicesService.findOne(clinicId, id);
    const pdfBuffer = await this.invoicePdfService.generatePdf(
      clinicId,
      invoice,
    );
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="factura-${invoice.consecutivo}.pdf"`,
    });
    res.send(pdfBuffer);
  }

  @Post(':id/send-email')
  @UseGuards(JwtAuthGuard)
  async sendEmail(
    @Clinic() clinicId: string,
    @Param('id', MongoIdValidationPipe) id: string,
    @Body() dto: SendInvoiceEmailDto,
  ) {
    const invoice = await this.invoicesService.findOne(clinicId, id);
    const settings = await this.clinicSettingsService.findByClinicId(clinicId);
    const pdfBuffer = await this.invoicePdfService.generatePdf(
      clinicId,
      invoice,
    );
    return this.invoiceEmailService.sendInvoiceEmail({
      recipientEmail: dto.recipientEmail,
      subject:
        dto.subject ||
        `Factura Electronica -- ${settings.businessName || 'ClinicCR'}`,
      message: dto.message,
      pdfBuffer,
      invoice,
      clinicName: settings.businessName || 'ClinicCR',
    });
  }

  @Post(':id/send-whatsapp')
  @UseGuards(JwtAuthGuard)
  async sendWhatsapp(
    @Clinic() clinicId: string,
    @Param('id', MongoIdValidationPipe) id: string,
    @Body() dto: SendInvoiceWhatsappDto,
  ) {
    const invoice = await this.invoicesService.findOne(clinicId, id);
    const settings = await this.clinicSettingsService.findByClinicId(clinicId);
    return this.invoiceWhatsappService.sendInvoiceWhatsapp({
      recipientPhone: dto.recipientPhone,
      invoice,
      clinicName: settings.businessName || 'ClinicCR',
    });
  }
}
