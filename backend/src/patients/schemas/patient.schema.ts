import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ _id: false })
export class PatientPhone {
  @Prop({ default: '506' })
  countryCode: string;

  @Prop({ default: '' })
  number: string;
}

@Schema({ _id: false })
export class PatientAddress {
  @Prop({ default: '' })
  province: string;

  @Prop({ default: '' })
  canton: string;

  @Prop({ default: '' })
  district: string;

  @Prop({ default: '' })
  otherSigns: string;
}

@Schema({ timestamps: true })
export class Patient extends Document {
  @Prop({ type: Types.ObjectId, required: true })
  clinicId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  firstName: string;

  @Prop({ required: true, trim: true })
  lastName: string;

  @Prop({ required: true, enum: ['01', '02', '03', '04'] })
  identificationType: string;

  @Prop({ required: true })
  identificationNumber: string;

  @Prop({ lowercase: true, trim: true, default: '' })
  email: string;

  @Prop({ type: PatientPhone, default: () => ({}) })
  phone: PatientPhone;

  @Prop({ type: PatientAddress, default: () => ({}) })
  address: PatientAddress;

  @Prop({ type: Types.ObjectId, ref: 'PatientFormTemplate', default: null })
  formTemplateId: Types.ObjectId;

  @Prop({ type: Map, of: Object, default: () => new Map() })
  customFields: Map<string, any>;

  @Prop({ default: true })
  isActive: boolean;
}

export const PatientSchema = SchemaFactory.createForClass(Patient);

PatientSchema.index(
  { clinicId: 1, identificationNumber: 1 },
  { unique: true },
);
