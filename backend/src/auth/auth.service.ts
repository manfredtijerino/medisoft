import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Types } from 'mongoose';
import { UsersService } from '../users/users.service';
import { ClinicSettingsService } from '../clinic-settings/clinic-settings.service';
import { EncryptionUtil } from '../common/utils/encryption.util';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private clinicSettingsService: ClinicSettingsService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const clinicId = new Types.ObjectId();

    await this.clinicSettingsService.create(clinicId);

    const user = await this.usersService.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email.toLowerCase(),
      password: hashedPassword,
      clinicId,
    });

    const token = this.signToken(user);

    return {
      user: this.sanitizeUser(user),
      accessToken: token,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.authProvider === 'google' && !user.password) {
      throw new BadRequestException(
        'This account uses Google login. Please use the "Continue with Google" button.',
      );
    }

    const passwordValid = await bcrypt.compare(dto.password, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new ForbiddenException('Account is deactivated');
    }

    await this.usersService.updateLastLogin(user._id.toString());

    const token = this.signToken(user);

    return {
      user: this.sanitizeUser(user),
      accessToken: token,
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);

    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto
        .createHash('sha256')
        .update(rawToken)
        .digest('hex');

      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await this.usersService.setResetToken(
        user._id.toString(),
        hashedToken,
        expires,
      );

      // In production: send email with rawToken
      // For development: log to console
      console.log(`[DEV] Password reset token for ${dto.email}: ${rawToken}`);
    }

    return {
      message:
        'If an account with that email exists, a password reset link has been sent.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const hashedToken = crypto
      .createHash('sha256')
      .update(dto.token)
      .digest('hex');

    const user = await this.usersService.findByResetToken(hashedToken);
    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
    await this.usersService.updatePassword(user._id.toString(), hashedPassword);

    return { message: 'Password has been reset successfully' };
  }

  async getProfile(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException();
    }
    return this.sanitizeUser(user);
  }

  async googleLogin(googleProfile: {
    googleId: string;
    email: string;
    firstName: string;
    lastName: string;
    refreshToken?: string;
  }) {
    const encryptedRefreshToken = googleProfile.refreshToken
      ? EncryptionUtil.encrypt(
          googleProfile.refreshToken,
          this.configService.get<string>('ENCRYPTION_KEY', ''),
        )
      : undefined;

    // Check if user exists by googleId
    let user: any = await this.usersService.findByGoogleId(googleProfile.googleId);

    if (user) {
      // Existing Google user — update refresh token if provided
      if (encryptedRefreshToken) {
        await this.usersService.updateGoogleRefreshToken(
          user._id.toString(),
          encryptedRefreshToken,
        );
      }
      await this.usersService.updateLastLogin(user._id.toString());
      return {
        user: this.sanitizeUser(user),
        accessToken: this.signToken(user),
      };
    }

    // Check if user exists by email (existing email/password user)
    user = await this.usersService.findByEmail(googleProfile.email);

    if (user) {
      // Link Google to existing account
      await this.usersService.linkGoogleAccount(
        user._id.toString(),
        googleProfile.googleId,
        encryptedRefreshToken,
      );
      await this.usersService.updateLastLogin(user._id.toString());
      return {
        user: this.sanitizeUser(user),
        accessToken: this.signToken(user),
      };
    }

    // New user — create account + clinic
    const clinicId = new Types.ObjectId();
    await this.clinicSettingsService.create(clinicId);

    const newUser = await this.usersService.createGoogleUser({
      firstName: googleProfile.firstName,
      lastName: googleProfile.lastName,
      email: googleProfile.email.toLowerCase(),
      googleId: googleProfile.googleId,
      clinicId,
      googleRefreshToken: encryptedRefreshToken,
    });

    return {
      user: this.sanitizeUser(newUser),
      accessToken: this.signToken(newUser),
    };
  }

  private signToken(user: any): string {
    const payload = {
      sub: user._id.toString(),
      clinicId: user.clinicId.toString(),
      email: user.email,
    };
    return this.jwtService.sign(payload);
  }

  private sanitizeUser(user: any) {
    return {
      id: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      clinicId: user.clinicId.toString(),
      role: user.role,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    };
  }
}
