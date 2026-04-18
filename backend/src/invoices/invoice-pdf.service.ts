import { Injectable } from '@nestjs/common';
import { ClinicSettingsService } from '../clinic-settings/clinic-settings.service';

@Injectable()
export class InvoicePdfService {
  constructor(
    private readonly clinicSettingsService: ClinicSettingsService,
  ) {}

  async generatePdf(clinicId: string, invoice: any): Promise<Buffer> {
    const settings = await this.clinicSettingsService.findByClinicId(clinicId);

    return new Promise((resolve, reject) => {
      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // --- HEADER: Clinic Info ---
      if (settings.logo) {
        doc.image(settings.logo, 50, 45, { width: 80 });
        doc.moveDown();
      }

      // Clinic name and info (right-aligned)
      doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .text(settings.businessName || 'Clinic', 150, 50, { align: 'right' });
      doc
        .fontSize(9)
        .font('Helvetica')
        .text(
          `Cedula: ${settings.identificationNumber || ''}`,
          { align: 'right' },
        )
        .text(
          `Tel: ${settings.phone?.countryCode || '506'}-${settings.phone?.number || ''}`,
          { align: 'right' },
        )
        .text(settings.email || '', { align: 'right' });

      // --- DOCUMENT TYPE ---
      doc.moveDown(2);
      const docTypeNames: Record<string, string> = {
        '01': 'FACTURA ELECTRONICA',
        '02': 'NOTA DE DEBITO ELECTRONICA',
        '03': 'NOTA DE CREDITO ELECTRONICA',
        '04': 'TIQUETE ELECTRONICO',
        '08': 'FACTURA ELECTRONICA DE COMPRA',
        '09': 'FACTURA ELECTRONICA DE EXPORTACION',
      };
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .text(docTypeNames[invoice.documentType] || 'DOCUMENTO', {
          align: 'center',
        });

      // --- INVOICE INFO ---
      doc.moveDown();
      doc.fontSize(9).font('Helvetica');
      doc.text(`Consecutivo: ${invoice.consecutivo || ''}`);
      doc.text(`Clave: ${invoice.clave || ''}`);
      doc.text(
        `Fecha: ${new Date(invoice.createdAt).toLocaleDateString('es-CR')}`,
      );
      doc.text(
        `Estado Hacienda: ${(invoice.haciendaStatus || 'pending').toUpperCase()}`,
      );

      // --- RECEIVER ---
      if (invoice.receiver) {
        doc.moveDown();
        doc.font('Helvetica-Bold').text('Cliente:');
        doc
          .font('Helvetica')
          .text(`${invoice.receiver.name || ''}`)
          .text(`Cedula: ${invoice.receiver.identificationNumber || ''}`)
          .text(`Email: ${invoice.receiver.email || ''}`);
      }

      // --- LINE ITEMS TABLE ---
      doc.moveDown();
      const tableTop = doc.y;
      const col1 = 50;
      const col2 = 250;
      const col3 = 320;
      const col4 = 390;
      const col5 = 460;

      // Table header
      doc.font('Helvetica-Bold').fontSize(9);
      doc.text('Descripcion', col1, tableTop);
      doc.text('Cant', col2, tableTop);
      doc.text('Precio', col3, tableTop);
      doc.text('Impuesto', col4, tableTop);
      doc.text('Total', col5, tableTop);

      doc
        .moveTo(50, tableTop + 15)
        .lineTo(545, tableTop + 15)
        .stroke();

      // Table rows
      doc.font('Helvetica').fontSize(8);
      let y = tableTop + 22;
      for (const item of invoice.items || []) {
        if (y > 700) {
          doc.addPage();
          y = 50;
        }
        doc.text(item.description || '', col1, y, { width: 195 });
        doc.text(String(item.quantity || 0), col2, y);
        doc.text(
          this.formatCurrency(item.unitPrice || 0, invoice.currency),
          col3,
          y,
        );
        doc.text(
          this.formatCurrency(item.tax?.amount || 0, invoice.currency),
          col4,
          y,
        );
        doc.text(
          this.formatCurrency(item.lineTotal || 0, invoice.currency),
          col5,
          y,
        );
        y += 18;
      }

      // --- SUMMARY ---
      doc
        .moveTo(50, y + 5)
        .lineTo(545, y + 5)
        .stroke();
      y += 15;
      doc.font('Helvetica').fontSize(9);
      const summary = invoice.summary || {};
      doc.text('Subtotal:', 380, y);
      doc.text(
        this.formatCurrency(summary.totalNetSale || 0, invoice.currency),
        col5,
        y,
      );
      y += 15;
      doc.text('Descuento:', 380, y);
      doc.text(
        this.formatCurrency(summary.totalDiscount || 0, invoice.currency),
        col5,
        y,
      );
      y += 15;
      doc.text('Impuesto:', 380, y);
      doc.text(
        this.formatCurrency(summary.totalTax || 0, invoice.currency),
        col5,
        y,
      );
      y += 15;
      doc.font('Helvetica-Bold').fontSize(11);
      doc.text('TOTAL:', 380, y);
      doc.text(
        this.formatCurrency(summary.totalVoucher || 0, invoice.currency),
        col5,
        y,
      );

      // --- FOOTER ---
      doc
        .fontSize(8)
        .font('Helvetica')
        .text('Documento generado por ClinicCR', 50, 780, {
          align: 'center',
          width: 495,
        });

      doc.end();
    });
  }

  private formatCurrency(amount: number, currency: string = 'CRC'): string {
    const symbol =
      currency === 'USD' ? '$' : currency === 'EUR' ? '\u20AC' : '\u20A1';
    return `${symbol}${amount.toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}
