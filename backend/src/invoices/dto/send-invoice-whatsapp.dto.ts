import { IsString, IsNotEmpty } from 'class-validator';

export class SendInvoiceWhatsappDto {
  @IsString()
  @IsNotEmpty()
  recipientPhone: string; // e.g. "+50688881234"
}
