import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsBoolean,
  IsIn,
  Min,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class DiscountDto {
  @IsString()
  code: string;

  @IsString()
  reason: string;

  @IsNumber()
  @Min(0)
  amount: number;
}

export class InvoiceItemDto {
  @IsString()
  productId: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DiscountDto)
  discounts?: DiscountDto[];
}

export class PaymentMethodDto {
  @IsString()
  code: string;

  @IsNumber()
  @Min(0)
  amount: number;
}

export class CreateInvoiceDto {
  @IsString()
  @IsIn(['01', '02', '03', '04', '08', '09'])
  documentType: string;

  @IsOptional()
  @IsString()
  patientId?: string;

  @IsString()
  @IsIn(['01', '02', '03', '04', '05', '06', '07', '08', '09', '99'])
  saleCondition: string;

  @IsOptional()
  @IsNumber()
  creditTermDays?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentMethodDto)
  paymentMethods: PaymentMethodDto[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];

  @IsOptional()
  @IsString()
  @IsIn(['CRC', 'USD', 'EUR'])
  currency?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  sendToHacienda?: boolean;
}
