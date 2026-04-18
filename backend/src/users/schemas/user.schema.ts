import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true, trim: true })
  firstName: string;

  @Prop({ required: true, trim: true })
  lastName: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ default: null })
  password: string;

  @Prop({ type: Types.ObjectId, required: true })
  clinicId: Types.ObjectId;

  @Prop({ default: null, index: true })
  googleId: string;

  @Prop({ default: 'local' })
  authProvider: string; // 'local' | 'google'

  @Prop({ default: null })
  googleRefreshToken: string; // encrypted with EncryptionUtil

  @Prop({ default: 'owner' })
  role: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: null })
  passwordResetToken: string;

  @Prop({ default: null })
  passwordResetExpires: Date;

  @Prop({ default: null })
  lastLoginAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
