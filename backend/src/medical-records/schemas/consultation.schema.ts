import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ _id: false })
export class Vitals {
  @Prop()
  bloodPressure: string;

  @Prop()
  heartRate: number;

  @Prop()
  temperature: number;

  @Prop()
  weight: number;

  @Prop()
  height: number;

  @Prop()
  oxygenSaturation: number;
}

@Schema({ _id: false })
export class Prescription {
  @Prop({ required: true })
  medication: string;

  @Prop({ default: '' })
  dosage: string;

  @Prop({ default: '' })
  frequency: string;

  @Prop({ default: '' })
  duration: string;

  @Prop({ default: '' })
  instructions: string;
}

@Schema({ timestamps: true })
export class Consultation extends Document {
  @Prop({ type: Types.ObjectId, required: true })
  clinicId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  patientId: Types.ObjectId;

  @Prop({ required: true })
  date: Date;

  @Prop({ default: '' })
  chiefComplaint: string;

  @Prop({ default: '' })
  diagnosis: string;

  @Prop({ default: '' })
  treatment: string;

  @Prop({ default: '' })
  notes: string;

  @Prop({ type: Vitals })
  vitals: Vitals;

  @Prop({ type: [Prescription], default: [] })
  prescriptions: Prescription[];

  @Prop()
  followUpDate: Date;

  @Prop({ default: true })
  isActive: boolean;
}

export const ConsultationSchema =
  SchemaFactory.createForClass(Consultation);

ConsultationSchema.index({ clinicId: 1, patientId: 1, date: -1 });
