import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsIn,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { InvoiceItemDto } from './create-invoice.dto';

export class CreateNoteDto {
  @IsString()
  @IsIn(['01', '02', '04', '05', '99'])
  referenceCode: string;

  @IsString()
  reason: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];

  @IsOptional()
  @IsBoolean()
  sendToHacienda?: boolean;
}
