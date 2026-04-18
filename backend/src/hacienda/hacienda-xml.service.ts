import { Injectable, Logger } from '@nestjs/common';
import { create } from 'xmlbuilder2';
import * as forge from 'node-forge';
import * as xmlCrypto from 'xml-crypto';
import { ClinicSettings } from '../clinic-settings/schemas/clinic-settings.schema';

export interface InvoiceLineItem {
  lineNumber: number;
  commercialCode?: string;
  cabysCode: string;
  quantity: number;
  unitOfMeasure: string;
  description: string;
  unitPrice: number;
  totalAmount: number;
  discount?: {
    amount: number;
    reason: string;
  };
  subTotal: number;
  tax?: {
    code: string;
    rateCode: string;
    rate: number;
    amount: number;
  };
  lineTotalAmount: number;
}

export interface InvoiceReceiver {
  name: string;
  identificationType: string;
  identificationNumber: string;
  email?: string;
  phone?: {
    countryCode: string;
    number: string;
  };
  location?: {
    province: string;
    canton: string;
    district: string;
    otherSigns: string;
  };
}

export interface InvoiceData {
  clave: string;
  activityCode: string;
  consecutivo: string;
  issueDate: Date;
  receiver?: InvoiceReceiver;
  saleCondition: string;
  creditTerm?: string;
  paymentMethod: string;
  lines: InvoiceLineItem[];
  summary: {
    totalTaxableServices: number;
    totalExemptServices: number;
    totalTaxableGoods: number;
    totalExemptGoods: number;
    totalTaxable: number;
    totalExempt: number;
    totalSales: number;
    totalDiscounts: number;
    totalNetSales: number;
    totalTax: number;
    totalVoucher: number;
  };
}

export interface DocumentReference {
  documentType: string;
  referenceNumber: string;
  issueDate: string;
  referenceCode: string;
  reason: string;
}

const HACIENDA_NS =
  'https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/facturaElectronica';
const HACIENDA_NC_NS =
  'https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/notaCreditoElectronica';
const HACIENDA_ND_NS =
  'https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/notaDebitoElectronica';

@Injectable()
export class HaciendaXmlService {
  private readonly logger = new Logger(HaciendaXmlService.name);

  /**
   * Build a FacturaElectronica XML document following Hacienda v4.4 schema.
   */
  buildInvoiceXml(
    invoiceData: InvoiceData,
    clinicSettings: ClinicSettings,
  ): string {
    const doc = create({ version: '1.0', encoding: 'UTF-8' });

    const root = doc.ele(HACIENDA_NS, 'FacturaElectronica');

    root.ele('Clave').txt(invoiceData.clave);
    root.ele('CodigoActividad').txt(invoiceData.activityCode);
    root.ele('NumeroConsecutivo').txt(invoiceData.consecutivo);
    root.ele('FechaEmision').txt(invoiceData.issueDate.toISOString());

    // Emisor (Issuer)
    this.buildEmisor(root, clinicSettings);

    // Receptor (Receiver)
    if (invoiceData.receiver) {
      this.buildReceptor(root, invoiceData.receiver);
    }

    // Sale condition
    root.ele('CondicionVenta').txt(invoiceData.saleCondition);
    if (invoiceData.creditTerm) {
      root.ele('PlazoCredito').txt(invoiceData.creditTerm);
    }
    root.ele('MedioPago').txt(invoiceData.paymentMethod);

    // Line items
    this.buildDetalleServicio(root, invoiceData.lines);

    // Summary
    this.buildResumenFactura(root, invoiceData.summary);

    return doc.end({ prettyPrint: true });
  }

  /**
   * Build a NotaCreditoElectronica XML document.
   */
  buildCreditNoteXml(
    invoiceData: InvoiceData,
    reference: DocumentReference,
    clinicSettings: ClinicSettings,
  ): string {
    const doc = create({ version: '1.0', encoding: 'UTF-8' });

    const root = doc.ele(HACIENDA_NC_NS, 'NotaCreditoElectronica');

    root.ele('Clave').txt(invoiceData.clave);
    root.ele('CodigoActividad').txt(invoiceData.activityCode);
    root.ele('NumeroConsecutivo').txt(invoiceData.consecutivo);
    root.ele('FechaEmision').txt(invoiceData.issueDate.toISOString());

    this.buildEmisor(root, clinicSettings);

    if (invoiceData.receiver) {
      this.buildReceptor(root, invoiceData.receiver);
    }

    root.ele('CondicionVenta').txt(invoiceData.saleCondition);
    if (invoiceData.creditTerm) {
      root.ele('PlazoCredito').txt(invoiceData.creditTerm);
    }
    root.ele('MedioPago').txt(invoiceData.paymentMethod);

    this.buildDetalleServicio(root, invoiceData.lines);

    // InformacionReferencia
    this.buildInformacionReferencia(root, reference);

    this.buildResumenFactura(root, invoiceData.summary);

    return doc.end({ prettyPrint: true });
  }

  /**
   * Build a NotaDebitoElectronica XML document.
   */
  buildDebitNoteXml(
    invoiceData: InvoiceData,
    reference: DocumentReference,
    clinicSettings: ClinicSettings,
  ): string {
    const doc = create({ version: '1.0', encoding: 'UTF-8' });

    const root = doc.ele(HACIENDA_ND_NS, 'NotaDebitoElectronica');

    root.ele('Clave').txt(invoiceData.clave);
    root.ele('CodigoActividad').txt(invoiceData.activityCode);
    root.ele('NumeroConsecutivo').txt(invoiceData.consecutivo);
    root.ele('FechaEmision').txt(invoiceData.issueDate.toISOString());

    this.buildEmisor(root, clinicSettings);

    if (invoiceData.receiver) {
      this.buildReceptor(root, invoiceData.receiver);
    }

    root.ele('CondicionVenta').txt(invoiceData.saleCondition);
    if (invoiceData.creditTerm) {
      root.ele('PlazoCredito').txt(invoiceData.creditTerm);
    }
    root.ele('MedioPago').txt(invoiceData.paymentMethod);

    this.buildDetalleServicio(root, invoiceData.lines);

    // InformacionReferencia
    this.buildInformacionReferencia(root, reference);

    this.buildResumenFactura(root, invoiceData.summary);

    return doc.end({ prettyPrint: true });
  }

  /**
   * Sign an XML document with XAdES-EPES using a .p12 certificate.
   */
  signXml(xml: string, p12Buffer: Buffer, p12Pin: string): string {
    // Load .p12 and extract key + certificate
    const p12Der = forge.util.createBuffer(p12Buffer.toString('binary'));
    const p12Asn1 = forge.asn1.fromDer(p12Der);
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, p12Pin);

    // Extract private key
    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    const keyBag =
      keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];
    if (!keyBag?.key) {
      throw new Error('Could not extract private key from .p12 file');
    }
    const privateKeyPem = forge.pki.privateKeyToPem(keyBag.key);

    // Extract certificate
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const certBag = certBags[forge.pki.oids.certBag]?.[0];
    if (!certBag?.cert) {
      throw new Error('Could not extract certificate from .p12 file');
    }
    const certPem = forge.pki.certificateToPem(certBag.cert);

    // Create XML signature with publicCert for KeyInfo generation
    const sig = new xmlCrypto.SignedXml({
      privateKey: privateKeyPem,
      publicCert: certPem,
      canonicalizationAlgorithm:
        'http://www.w3.org/2001/10/xml-exc-c14n#',
      signatureAlgorithm:
        'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
    });

    sig.addReference({
      xpath: '/*',
      transforms: [
        'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
        'http://www.w3.org/2001/10/xml-exc-c14n#',
      ],
      digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
    });

    sig.computeSignature(xml, {
      location: { reference: '/*', action: 'append' },
    });

    return sig.getSignedXml();
  }

  // ---------- Private helper methods ----------

  private buildEmisor(
    root: ReturnType<ReturnType<typeof create>['ele']>,
    settings: ClinicSettings,
  ): void {
    const emisor = root.ele('Emisor');
    emisor.ele('Nombre').txt(settings.businessName);

    const identification = emisor.ele('Identificacion');
    identification.ele('Tipo').txt(settings.identificationType);
    identification.ele('Numero').txt(settings.identificationNumber);

    if (settings.commercialName) {
      emisor.ele('NombreComercial').txt(settings.commercialName);
    }

    const ubicacion = emisor.ele('Ubicacion');
    ubicacion.ele('Provincia').txt(settings.location.province);
    ubicacion.ele('Canton').txt(settings.location.canton);
    ubicacion.ele('Distrito').txt(settings.location.district);
    ubicacion.ele('OtrasSenas').txt(settings.location.otherSigns || 'N/A');

    if (settings.phone?.number) {
      const telefono = emisor.ele('Telefono');
      telefono.ele('CodigoPais').txt(settings.phone.countryCode || '506');
      telefono.ele('NumTelefono').txt(settings.phone.number);
    }

    emisor.ele('CorreoElectronico').txt(settings.email);
  }

  private buildReceptor(
    root: ReturnType<ReturnType<typeof create>['ele']>,
    receiver: InvoiceReceiver,
  ): void {
    const receptor = root.ele('Receptor');
    receptor.ele('Nombre').txt(receiver.name);

    const identification = receptor.ele('Identificacion');
    identification.ele('Tipo').txt(receiver.identificationType);
    identification.ele('Numero').txt(receiver.identificationNumber);

    if (receiver.location) {
      const ubicacion = receptor.ele('Ubicacion');
      ubicacion.ele('Provincia').txt(receiver.location.province);
      ubicacion.ele('Canton').txt(receiver.location.canton);
      ubicacion.ele('Distrito').txt(receiver.location.district);
      ubicacion
        .ele('OtrasSenas')
        .txt(receiver.location.otherSigns || 'N/A');
    }

    if (receiver.phone?.number) {
      const telefono = receptor.ele('Telefono');
      telefono.ele('CodigoPais').txt(receiver.phone.countryCode || '506');
      telefono.ele('NumTelefono').txt(receiver.phone.number);
    }

    if (receiver.email) {
      receptor.ele('CorreoElectronico').txt(receiver.email);
    }
  }

  private buildDetalleServicio(
    root: ReturnType<ReturnType<typeof create>['ele']>,
    lines: InvoiceLineItem[],
  ): void {
    const detalle = root.ele('DetalleServicio');

    for (const line of lines) {
      const lineaDetalle = detalle.ele('LineaDetalle');
      lineaDetalle.ele('NumeroLinea').txt(String(line.lineNumber));

      if (line.commercialCode) {
        const codigoComercial = lineaDetalle.ele('CodigoComercial');
        codigoComercial.ele('Tipo').txt('04');
        codigoComercial.ele('Codigo').txt(line.commercialCode);
      }

      lineaDetalle.ele('CodigoCabys').txt(line.cabysCode);
      lineaDetalle.ele('Cantidad').txt(this.formatAmount(line.quantity));
      lineaDetalle.ele('UnidadMedida').txt(line.unitOfMeasure);
      lineaDetalle.ele('Detalle').txt(line.description);
      lineaDetalle
        .ele('PrecioUnitario')
        .txt(this.formatAmount(line.unitPrice));
      lineaDetalle
        .ele('MontoTotal')
        .txt(this.formatAmount(line.totalAmount));

      if (line.discount && line.discount.amount > 0) {
        const descuento = lineaDetalle.ele('Descuento');
        descuento
          .ele('MontoDescuento')
          .txt(this.formatAmount(line.discount.amount));
        descuento.ele('NaturalezaDescuento').txt(line.discount.reason);
      }

      lineaDetalle.ele('SubTotal').txt(this.formatAmount(line.subTotal));

      if (line.tax && line.tax.amount > 0) {
        const impuesto = lineaDetalle.ele('Impuesto');
        impuesto.ele('Codigo').txt(line.tax.code);
        impuesto.ele('CodigoTarifa').txt(line.tax.rateCode);
        impuesto.ele('Tarifa').txt(this.formatAmount(line.tax.rate));
        impuesto.ele('Monto').txt(this.formatAmount(line.tax.amount));
      }

      lineaDetalle
        .ele('MontoTotalLinea')
        .txt(this.formatAmount(line.lineTotalAmount));
    }
  }

  private buildResumenFactura(
    root: ReturnType<ReturnType<typeof create>['ele']>,
    summary: InvoiceData['summary'],
  ): void {
    const resumen = root.ele('ResumenFactura');
    resumen
      .ele('TotalServGravados')
      .txt(this.formatAmount(summary.totalTaxableServices));
    resumen
      .ele('TotalServExentos')
      .txt(this.formatAmount(summary.totalExemptServices));
    resumen
      .ele('TotalMercanciasGravadas')
      .txt(this.formatAmount(summary.totalTaxableGoods));
    resumen
      .ele('TotalMercanciasExentas')
      .txt(this.formatAmount(summary.totalExemptGoods));
    resumen
      .ele('TotalGravado')
      .txt(this.formatAmount(summary.totalTaxable));
    resumen
      .ele('TotalExento')
      .txt(this.formatAmount(summary.totalExempt));
    resumen
      .ele('TotalVenta')
      .txt(this.formatAmount(summary.totalSales));
    resumen
      .ele('TotalDescuentos')
      .txt(this.formatAmount(summary.totalDiscounts));
    resumen
      .ele('TotalVentaNeta')
      .txt(this.formatAmount(summary.totalNetSales));
    resumen
      .ele('TotalImpuesto')
      .txt(this.formatAmount(summary.totalTax));
    resumen
      .ele('TotalComprobante')
      .txt(this.formatAmount(summary.totalVoucher));
  }

  private buildInformacionReferencia(
    root: ReturnType<ReturnType<typeof create>['ele']>,
    reference: DocumentReference,
  ): void {
    const infoRef = root.ele('InformacionReferencia');
    infoRef.ele('TipoDoc').txt(reference.documentType);
    infoRef.ele('Numero').txt(reference.referenceNumber);
    infoRef.ele('FechaEmision').txt(reference.issueDate);
    infoRef.ele('Codigo').txt(reference.referenceCode);
    infoRef.ele('Razon').txt(reference.reason);
  }

  private formatAmount(value: number): string {
    return value.toFixed(5);
  }
}
