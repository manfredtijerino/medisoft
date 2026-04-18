import { IsString, IsNotEmpty, IsIn, IsOptional } from 'class-validator';

export class LinkHaciendaDto {
  @IsString()
  @IsNotEmpty()
  atvUsername: string;

  @IsString()
  @IsNotEmpty()
  atvPassword: string;

  @IsString()
  @IsNotEmpty()
  cryptoKeyPin: string;

  @IsString()
  @IsIn(['staging', 'production'])
  environment: string;

  @IsOptional()
  @IsString()
  callbackUrl?: string;
}
