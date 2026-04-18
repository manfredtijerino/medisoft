import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsIn,
  IsNumber,
  ArrayMinSize,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export class FormFieldDto {
  @IsString()
  @IsNotEmpty()
  fieldKey: string;

  @IsString()
  @IsNotEmpty()
  label: string;

  @IsString()
  @IsIn([
    'text',
    'number',
    'date',
    'select',
    'multiselect',
    'boolean',
    'textarea',
    'email',
    'phone',
  ])
  fieldType: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsNumber()
  order: number;

  @IsOptional()
  @IsString()
  placeholder?: string;

  @IsOptional()
  @IsString()
  validationRegex?: string;
}

export class CreateFormTemplateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => FormFieldDto)
  fields: FormFieldDto[];
}
