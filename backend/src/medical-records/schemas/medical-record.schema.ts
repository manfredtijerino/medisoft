import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ _id: false })
export class CurrentMedication {
  @Prop({ required: true })
  name: string;

  @Prop({ default: '' })
  dosage: string;

  @Prop({ default: '' })
  frequency: string;

  @Prop()
  startDate: Date;
}

@Schema({ _id: false })
export class SurgicalHistoryEntry {
  @Prop({ required: true })
  procedure: string;

  @Prop()
  date: Date;

  @Prop({ default: '' })
  notes: string;
}

@Schema({ timestamps: true })
export class MedicalRecord extends Document {
  @Prop({ type: Types.ObjectId, required: true })
  clinicId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  patientId: Types.ObjectId;

  @Prop({ type: [String], default: [] })
  chronicConditions: string[];

  @Prop({ type: [String], default: [] })
  allergies: string[];

  @Prop({ type: [CurrentMedication], default: [] })
  currentMedications: CurrentMedication[];

  @Prop({ type: [SurgicalHistoryEntry], default: [] })
  surgicalHistory: SurgicalHistoryEntry[];

  @Prop({ default: '' })
  familyHistory: string;

  @Prop({ default: '' })
  bloodType: string;

  @Prop({ default: '' })
  notes: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const MedicalRecordSchema =
  SchemaFactory.createForClass(MedicalRecord);

MedicalRecordSchema.index(
  { clinicId: 1, patientId: 1 },
  { unique: true },
);
