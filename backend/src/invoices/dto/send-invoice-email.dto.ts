import { IsEmail, IsOptional, IsString } from 'class-validator';

export class SendInvoiceEmailDto {
  @IsEmail()
  recipientEmail: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  message?: string;
}
