import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

@Schema({ _id: false })
export class InvoiceIssuer {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  identificationType: string;

  @Prop({ required: true })
  identificationNumber: string;

  @Prop()
  email: string;

  @Prop()
  phone: string;
}

@Schema({ _id: false })
export class InvoiceReceiver {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  identificationType: string;

  @Prop({ required: true })
  identificationNumber: string;

  @Prop()
  email: string;

  @Prop()
  phone: string;
}

@Schema({ _id: false })
export class PaymentMethod {
  @Prop({ required: true })
  code: string;

  @Prop({ required: true })
  amount: number;
}

@Schema({ _id: false })
export class InvoiceDiscount {
  @Prop({ required: true })
  code: string;

  @Prop({ required: true })
  reason: string;

  @Prop({ required: true })
  amount: number;
}

@Schema({ _id: false })
export class InvoiceItemTax {
  @Prop({ required: true })
  code: string;

  @Prop({ required: true })
  rateCode: string;

  @Prop({ required: true })
  rate: number;

  @Prop({ required: true })
  amount: number;
}

@Schema({ _id: false })
export class InvoiceItem {
  @Prop({ required: true })
  lineNumber: number;

  @Prop({ type: Types.ObjectId })
  productId: Types.ObjectId;

  @Prop({ required: true })
  cabysCode: string;

  @Prop()
  productCode: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  unitOfMeasure: string;

  @Prop({ required: true })
  unitPrice: number;

  @Prop({ required: true })
  subtotal: number;

  @Prop({ type: [InvoiceDiscount], default: [] })
  discounts: InvoiceDiscount[];

  @Prop({ default: 0 })
  discountTotal: number;

  @Prop({ required: true })
  netTotal: number;

  @Prop({ type: InvoiceItemTax })
  tax: InvoiceItemTax;

  @Prop({ required: true })
  lineTotal: number;
}

@Schema({ _id: false })
export class InvoiceSummary {
  @Prop({ default: 0 })
  totalTaxableServices: number;

  @Prop({ default: 0 })
  totalExemptServices: number;

  @Prop({ default: 0 })
  totalTaxableGoods: number;

  @Prop({ default: 0 })
  totalExemptGoods: number;

  @Prop({ default: 0 })
  totalTax: number;

  @Prop({ default: 0 })
  totalDiscount: number;

  @Prop({ default: 0 })
  totalNetSale: number;

  @Prop({ default: 0 })
  totalVoucher: number;
}

@Schema({ _id: false })
export class InvoiceReference {
  @Prop({ required: true })
  documentType: string;

  @Prop({ required: true })
  clave: string;

  @Prop({ required: true })
  date: Date;

  @Prop({ required: true })
  code: string;

  @Prop({ required: true })
  reason: string;
}

@Schema({ timestamps: true })
export class Invoice extends Document {
  @Prop({ type: Types.ObjectId, required: true })
  clinicId: Types.ObjectId;

  @Prop({ required: true, enum: ['01', '02', '03', '04', '08', '09'] })
  documentType: string;

  @Prop({ required: true, unique: true })
  clave: string;

  @Prop({ required: true })
  consecutivo: string;

  @Prop({ type: InvoiceIssuer })
  issuer: InvoiceIssuer;

  @Prop({ type: InvoiceReceiver })
  receiver: InvoiceReceiver;

  @Prop()
  saleCondition: string;

  @Prop()
  creditTermDays: number;

  @Prop({ type: [PaymentMethod], default: [] })
  paymentMethods: PaymentMethod[];

  @Prop({ default: 'CRC' })
  currency: string;

  @Prop({ type: [InvoiceItem], default: [] })
  items: InvoiceItem[];

  @Prop({ type: InvoiceSummary })
  summary: InvoiceSummary;

  @Prop({ type: [InvoiceReference], default: [] })
  references: InvoiceReference[];

  @Prop()
  signedXml: string;

  @Prop()
  notes: string;

  @Prop({ default: 'pending', enum: ['pending', 'sent', 'accepted', 'rejected'] })
  haciendaStatus: string;

  @Prop({ type: MongooseSchema.Types.Mixed })
  haciendaResponse: any;

  @Prop()
  sentAt: Date;

  @Prop({ default: false })
  isArchived: boolean;

  @Prop({ default: 'paid', enum: ['paid', 'pending', 'overdue'] })
  paymentStatus: string;

  @Prop({ default: 0 })
  remindersSent: number;

  @Prop({ default: null })
  lastReminderAt: Date;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);

InvoiceSchema.index({ clinicId: 1, createdAt: -1 });
InvoiceSchema.index({ clave: 1 }, { unique: true });
