import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ClinicSettings } from '../clinic-settings/schemas/clinic-settings.schema';

const DOCUMENT_TYPE_COUNTER_MAP: Record<string, string> = {
  '01': 'consecutives.lastInvoice',
  '02': 'consecutives.lastDebitNote',
  '03': 'consecutives.lastCreditNote',
  '04': 'consecutives.lastTicket',
  '08': 'consecutives.lastPurchaseInvoice',
  '09': 'consecutives.lastExportInvoice',
};

@Injectable()
export class HaciendaKeyService {
  constructor(
    @InjectModel(ClinicSettings.name)
    private clinicSettingsModel: Model<ClinicSettings>,
  ) {}

  /**
   * Generate a 20-character consecutivo string.
   * Format: headquarters(3) + pointOfSale(5) + documentType(2) + sequential(10)
   */
  async generateConsecutivo(
    clinicId: string,
    documentType: string,
  ): Promise<string> {
    const counterField = DOCUMENT_TYPE_COUNTER_MAP[documentType];
    if (!counterField) {
      throw new Error(`Unsupported document type: ${documentType}`);
    }

    const settings = await this.clinicSettingsModel.findOneAndUpdate(
      { clinicId },
      { $inc: { [counterField]: 1 } },
      { new: true },
    );

    if (!settings) {
      throw new NotFoundException(
        `Clinic settings not found for clinic ${clinicId}`,
      );
    }

    const headquarters = settings.consecutives.headquarters.padStart(3, '0');
    const pointOfSale = settings.consecutives.pointOfSale.padStart(5, '0');

    // Extract the incremented counter value
    const counterMap: Record<string, number> = {
      '01': settings.consecutives.lastInvoice,
      '02': settings.consecutives.lastDebitNote,
      '03': settings.consecutives.lastCreditNote,
      '04': settings.consecutives.lastTicket,
      '08': settings.consecutives.lastPurchaseInvoice,
      '09': settings.consecutives.lastExportInvoice,
    };

    const sequential = String(counterMap[documentType]).padStart(10, '0');

    return `${headquarters}${pointOfSale}${documentType}${sequential}`;
  }

  /**
   * Generate the 50-digit Clave Numérica for Hacienda electronic documents.
   * Format: countryCode(3) + day(2) + month(2) + year(2) + cedula(12) + consecutivo(20) + situation(1) + securityCode(8)
   */
  generateClave(params: {
    date: Date;
    issuerCedula: string;
    consecutivo: string;
    situation: '1' | '2' | '3';
  }): string {
    const { date, issuerCedula, consecutivo, situation } = params;

    const countryCode = '506';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    const cedula = issuerCedula.replace(/[^0-9]/g, '').padStart(12, '0');
    const securityCode = this.generateSecurityCode(8);

    return `${countryCode}${day}${month}${year}${cedula}${consecutivo}${situation}${securityCode}`;
  }

  /**
   * Generate a random numeric security code of the specified length.
   */
  private generateSecurityCode(length: number): string {
    let code = '';
    for (let i = 0; i < length; i++) {
      code += Math.floor(Math.random() * 10).toString();
    }
    return code;
  }
}
