import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ _id: false })
export class ProductTax {
  @Prop({ required: true })
  code: string;

  @Prop({ required: true })
  rateCode: string;

  @Prop({ required: true })
  rate: number;
}

@Schema({ timestamps: true })
export class Product extends Document {
  @Prop({ type: Types.ObjectId, required: true })
  clinicId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ required: true })
  cabysCode: string;

  @Prop()
  cabysDescription: string;

  @Prop()
  productCode: string;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ default: 'CRC' })
  currency: string;

  @Prop({ type: ProductTax, required: true })
  tax: ProductTax;

  @Prop({ required: true })
  unitOfMeasure: string;

  @Prop({ required: true })
  type: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

ProductSchema.index({ clinicId: 1, cabysCode: 1 });
