import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsEmail,
  ValidateNested,
  IsObject,
  IsMongoId,
} from 'class-validator';
import { Type } from 'class-transformer';

class PatientPhoneDto {
  @IsOptional()
  @IsString()
  countryCode?: string;

  @IsOptional()
  @IsString()
  number?: string;
}

class PatientAddressDto {
  @IsOptional()
  @IsString()
  province?: string;

  @IsOptional()
  @IsString()
  canton?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  otherSigns?: string;
}

export class CreatePatientDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsIn(['01', '02', '03', '04'])
  identificationType: string;

  @IsString()
  @IsNotEmpty()
  identificationNumber: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PatientPhoneDto)
  phone?: PatientPhoneDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PatientAddressDto)
  address?: PatientAddressDto;

  @IsOptional()
  @IsMongoId()
  formTemplateId?: string;

  @IsOptional()
  @IsObject()
  customFields?: Record<string, any>;
}
