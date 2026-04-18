import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model, Types } from 'mongoose';
import * as forge from 'node-forge';
import axios from 'axios';
import { ClinicSettings } from './schemas/clinic-settings.schema';
import { UpdateClinicSettingsDto } from './dto/update-clinic-settings.dto';
import { LinkHaciendaDto } from './dto/link-hacienda.dto';
import { EncryptionUtil } from '../common/utils/encryption.util';

@Injectable()
export class ClinicSettingsService {
  constructor(
    @InjectModel(ClinicSettings.name)
    private clinicSettingsModel: Model<ClinicSettings>,
    private readonly configService: ConfigService,
  ) {}

  async create(clinicId: Types.ObjectId): Promise<ClinicSettings> {
    const settings = new this.clinicSettingsModel({ clinicId });
    return settings.save();
  }

  async findByClinicId(clinicId: string): Promise<ClinicSettings> {
    const settings = await this.clinicSettingsModel.findOne({ clinicId });
    if (!settings) {
      throw new NotFoundException('Clinic settings not found');
    }
    return settings;
  }

  async update(
    clinicId: string,
    dto: UpdateClinicSettingsDto,
  ): Promise<ClinicSettings> {
    const updateData: any = {};

    const directFields = [
      'businessName',
      'commercialName',
      'identificationType',
      'identificationNumber',
      'economicActivityCode',
      'email',
      'currency',
    ];

    for (const field of directFields) {
      if (dto[field] !== undefined) {
        updateData[field] = dto[field];
      }
    }

    if (dto.phone) {
      for (const [key, value] of Object.entries(dto.phone)) {
        if (value !== undefined) {
          updateData[`phone.${key}`] = value;
        }
      }
    }

    if (dto.location) {
      for (const [key, value] of Object.entries(dto.location)) {
        if (value !== undefined) {
          updateData[`location.${key}`] = value;
        }
      }
    }

    const settings = await this.clinicSettingsModel.findOneAndUpdate(
      { clinicId },
      { $set: updateData },
      { new: true },
    );

    if (!settings) {
      throw new NotFoundException('Clinic settings not found');
    }

    return settings;
  }

  async linkHacienda(
    clinicId: string,
    dto: LinkHaciendaDto,
    p12File: Express.Multer.File,
  ): Promise<ClinicSettings> {
    if (!p12File) {
      throw new BadRequestException('.p12 certificate file is required');
    }

    // Validate the .p12 file with the provided PIN
    try {
      const p12Der = forge.util.createBuffer(
        p12File.buffer.toString('binary'),
      );
      const p12Asn1 = forge.asn1.fromDer(p12Der);
      forge.pkcs12.pkcs12FromAsn1(p12Asn1, dto.cryptoKeyPin);
    } catch {
      throw new BadRequestException(
        'Invalid .p12 file or incorrect PIN',
      );
    }

    const encryptionKey = this.configService.get<string>('ENCRYPTION_KEY', '');
    const encryptedPassword = EncryptionUtil.encrypt(
      dto.atvPassword,
      encryptionKey,
    );
    const encryptedPin = EncryptionUtil.encrypt(
      dto.cryptoKeyPin,
      encryptionKey,
    );

    const settings = await this.clinicSettingsModel.findOneAndUpdate(
      { clinicId },
      {
        $set: {
          'hacienda.atvUsername': dto.atvUsername,
          'hacienda.atvPassword': encryptedPassword,
          'hacienda.cryptoKeyP12': p12File.buffer,
          'hacienda.cryptoKeyPin': encryptedPin,
          'hacienda.environment': dto.environment,
          'hacienda.callbackUrl': dto.callbackUrl || '',
          'hacienda.isLinked': true,
        },
      },
      { new: true },
    );

    if (!settings) {
      throw new NotFoundException('Clinic settings not found');
    }

    return settings;
  }

  async testHaciendaConnection(clinicId: string) {
    const settings = await this.findByClinicId(clinicId);

    if (!settings.hacienda.isLinked) {
      throw new BadRequestException(
        'Hacienda credentials are not configured. Link your account first.',
      );
    }

    const encryptionKey = this.configService.get<string>('ENCRYPTION_KEY', '');
    const atvPassword = EncryptionUtil.decrypt(
      settings.hacienda.atvPassword,
      encryptionKey,
    );

    const idpUrl =
      settings.hacienda.environment === 'production'
        ? this.configService.get<string>('HACIENDA_IDP_PRODUCTION', '')
        : this.configService.get<string>('HACIENDA_IDP_STAGING', '');

    const params = new URLSearchParams({
      grant_type: 'password',
      client_id: 'api-stag',
      username: settings.hacienda.atvUsername,
      password: atvPassword,
    });

    try {
      const response = await axios.post(idpUrl, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      return {
        message: 'Hacienda connection successful',
        environment: settings.hacienda.environment,
        tokenObtained: !!response.data.access_token,
      };
    } catch (error) {
      throw new BadRequestException(
        `Hacienda authentication failed: ${error.response?.data?.error_description || error.message}`,
      );
    }
  }

  async uploadLogo(
    clinicId: string,
    file: Express.Multer.File,
  ): Promise<ClinicSettings> {
    if (!file) {
      throw new BadRequestException('Logo file is required');
    }

    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('Logo file must be 2MB or smaller');
    }

    const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/svg+xml'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Logo must be a PNG, JPEG, or SVG image',
      );
    }

    const settings = await this.clinicSettingsModel.findOneAndUpdate(
      { clinicId },
      {
        $set: {
          logo: file.buffer,
          logoMimeType: file.mimetype,
        },
      },
      { new: true },
    );

    if (!settings) {
      throw new NotFoundException('Clinic settings not found');
    }

    return settings;
  }

  async getLogo(
    clinicId: string,
  ): Promise<{ data: Buffer; mimeType: string }> {
    const settings = await this.findByClinicId(clinicId);

    if (!settings.logo) {
      throw new NotFoundException('No logo uploaded');
    }

    return { data: settings.logo, mimeType: settings.logoMimeType };
  }

  async removeLogo(clinicId: string): Promise<ClinicSettings> {
    const settings = await this.clinicSettingsModel.findOneAndUpdate(
      { clinicId },
      {
        $set: {
          logo: null,
          logoMimeType: '',
        },
      },
      { new: true },
    );

    if (!settings) {
      throw new NotFoundException('Clinic settings not found');
    }

    return settings;
  }

  async unlinkHacienda(clinicId: string): Promise<ClinicSettings> {
    const settings = await this.clinicSettingsModel.findOneAndUpdate(
      { clinicId },
      {
        $set: {
          'hacienda.atvUsername': '',
          'hacienda.atvPassword': '',
          'hacienda.cryptoKeyP12': null,
          'hacienda.cryptoKeyPin': '',
          'hacienda.environment': 'staging',
          'hacienda.callbackUrl': '',
          'hacienda.isLinked': false,
          'hacienda.cachedToken': '',
          'hacienda.tokenExpiresAt': null,
          'hacienda.lastTokenAt': null,
        },
      },
      { new: true },
    );

    if (!settings) {
      throw new NotFoundException('Clinic settings not found');
    }

    return settings;
  }
}
