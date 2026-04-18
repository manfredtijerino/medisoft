import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class CabysCache extends Document {
  @Prop({ required: true, index: true })
  code: string;

  @Prop({ required: true })
  description: string;

  @Prop()
  taxRate: number;

  @Prop()
  category: string;

  @Prop({ default: Date.now })
  fetchedAt: Date;

  @Prop({
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    index: { expires: 0 },
  })
  expiresAt: Date;
}

export const CabysCacheSchema = SchemaFactory.createForClass(CabysCache);
