import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ _id: false })
export class FormField {
  @Prop({ required: true })
  fieldKey: string;

  @Prop({ required: true })
  label: string;

  @Prop({
    required: true,
    enum: [
      'text',
      'number',
      'date',
      'select',
      'multiselect',
      'boolean',
      'textarea',
      'email',
      'phone',
    ],
  })
  fieldType: string;

  @Prop({ type: [String], default: [] })
  options: string[];

  @Prop({ default: false })
  required: boolean;

  @Prop({ required: true })
  order: number;

  @Prop({ default: '' })
  placeholder: string;

  @Prop({ default: '' })
  validationRegex: string;
}

@Schema({ timestamps: true })
export class PatientFormTemplate extends Document {
  @Prop({ type: Types.ObjectId, required: true })
  clinicId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ default: false })
  isDefault: boolean;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: [FormField], default: [] })
  fields: FormField[];
}

export const PatientFormTemplateSchema =
  SchemaFactory.createForClass(PatientFormTemplate);
