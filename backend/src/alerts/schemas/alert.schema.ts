import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Alert extends Document {
  @Prop({ type: Types.ObjectId, required: true })
  clinicId: Types.ObjectId;

  @Prop({
    required: true,
    enum: ['payment_overdue', 'payment_reminder', 'general'],
  })
  type: string;

  @Prop({ required: true })
  title: string;

  @Prop()
  message: string;

  @Prop({ enum: ['invoice', 'patient'] })
  referenceType: string;

  @Prop({ type: Types.ObjectId })
  referenceId: Types.ObjectId;

  @Prop({ default: 'info', enum: ['info', 'warning', 'critical'] })
  severity: string;

  @Prop({ default: false })
  isRead: boolean;

  @Prop({ default: false })
  isDismissed: boolean;
}

export const AlertSchema = SchemaFactory.createForClass(Alert);

AlertSchema.index({ clinicId: 1, isDismissed: 1, createdAt: -1 });
