import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsIn,
  Min,
  Max,
  Length,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ProductTaxDto {
  @IsString()
  @IsIn(['01', '02', '03', '04', '05', '06', '07', '08', '12', '99'])
  code: string;

  @IsString()
  @IsNotEmpty()
  rateCode: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  rate: number;
}

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @Length(13, 13)
  cabysCode: string;

  @IsOptional()
  @IsString()
  productCode?: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsIn(['CRC', 'USD', 'EUR'])
  currency?: string;

  @ValidateNested()
  @Type(() => ProductTaxDto)
  tax: ProductTaxDto;

  @IsString()
  @IsIn(['Sp', 'Unid', 'm', 'kg', 's', 'L', 'cm', 'Os'])
  unitOfMeasure: string;

  @IsString()
  @IsIn(['service', 'product'])
  type: string;
}
