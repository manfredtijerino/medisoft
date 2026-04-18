import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email: email.toLowerCase() });
  }

  async findById(id: string): Promise<User | null> {
    return this.userModel.findById(id);
  }

  async create(data: Partial<User>): Promise<User> {
    const user = new this.userModel(data);
    return user.save();
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      lastLoginAt: new Date(),
    });
  }

  async setResetToken(
    userId: string,
    hashedToken: string,
    expires: Date,
  ): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      passwordResetToken: hashedToken,
      passwordResetExpires: expires,
    });
  }

  async findByResetToken(hashedToken: string): Promise<User | null> {
    return this.userModel.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    });
  }

  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpires: null,
    });
  }

  async findByGoogleId(googleId: string) {
    return this.userModel.findOne({ googleId });
  }

  async createGoogleUser(data: {
    firstName: string;
    lastName: string;
    email: string;
    googleId: string;
    clinicId: Types.ObjectId;
    googleRefreshToken?: string;
  }) {
    return this.userModel.create({
      ...data,
      authProvider: 'google',
      password: undefined,
    } as any);
  }

  async linkGoogleAccount(
    userId: string,
    googleId: string,
    refreshToken?: string,
  ) {
    const updateData: any = { googleId, authProvider: 'google' };
    if (refreshToken) updateData.googleRefreshToken = refreshToken;
    return this.userModel.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true },
    );
  }

  async updateGoogleRefreshToken(userId: string, encryptedToken: string) {
    return this.userModel.findByIdAndUpdate(userId, {
      $set: { googleRefreshToken: encryptedToken },
    });
  }
}
