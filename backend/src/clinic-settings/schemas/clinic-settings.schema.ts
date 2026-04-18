import { Prop, Schema, SchemaFactory, raw } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ _id: false })
export class Phone {
  @Prop({ default: '506' })
  countryCode: string;

  @Prop({ default: '' })
  number: string;
}

@Schema({ _id: false })
export class Location {
  @Prop({ default: '' })
  province: string;

  @Prop({ default: '' })
  canton: string;

  @Prop({ default: '' })
  district: string;

  @Prop({ default: '' })
  neighborhood: string;

  @Prop({ default: '' })
  otherSigns: string;
}

@Schema({ _id: false })
export class HaciendaCredentials {
  @Prop({ default: '' })
  atvUsername: string;

  @Prop({ default: '' })
  atvPassword: string;

  @Prop({ type: Buffer, default: null })
  cryptoKeyP12: Buffer;

  @Prop({ default: '' })
  cryptoKeyPin: string;

  @Prop({ default: 'staging' })
  environment: string;

  @Prop({ default: '' })
  callbackUrl: string;

  @Prop({ default: false })
  isLinked: boolean;

  @Prop({ default: null })
  lastTokenAt: Date;

  @Prop({ default: '' })
  cachedToken: string;

  @Prop({ default: null })
  tokenExpiresAt: Date;
}

@Schema({ _id: false })
export class Consecutives {
  @Prop({ default: '001' })
  headquarters: string;

  @Prop({ default: '00001' })
  pointOfSale: string;

  @Prop({ default: 0 })
  lastInvoice: number;

  @Prop({ default: 0 })
  lastCreditNote: number;

  @Prop({ default: 0 })
  lastDebitNote: number;

  @Prop({ default: 0 })
  lastTicket: number;

  @Prop({ default: 0 })
  lastPurchaseInvoice: number;

  @Prop({ default: 0 })
  lastExportInvoice: number;

  @Prop({ default: 0 })
  lastPaymentReceipt: number;
}

@Schema({ timestamps: true })
export class ClinicSettings extends Document {
  @Prop({ type: Types.ObjectId, required: true, unique: true })
  clinicId: Types.ObjectId;

  @Prop({ default: '' })
  businessName: string;

  @Prop({ default: '' })
  commercialName: string;

  @Prop({ default: '' })
  identificationType: string;

  @Prop({ default: '' })
  identificationNumber: string;

  @Prop({ default: '' })
  economicActivityCode: string;

  @Prop({ default: '' })
  email: string;

  @Prop({ type: Phone, default: () => ({}) })
  phone: Phone;

  @Prop({ type: Location, default: () => ({}) })
  location: Location;

  @Prop({ type: HaciendaCredentials, default: () => ({}) })
  hacienda: HaciendaCredentials;

  @Prop({ type: Consecutives, default: () => ({}) })
  consecutives: Consecutives;

  @Prop({ default: 'CRC' })
  currency: string;

  @Prop({ type: Buffer, default: null })
  logo: Buffer;

  @Prop({ default: '' })
  logoMimeType: string;
}

export const ClinicSettingsSchema =
  SchemaFactory.createForClass(ClinicSettings);
