import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsArray,
  IsEmail,
} from 'class-validator';

export class CreateCalendarEventDto {
  @IsString()
  @IsNotEmpty()
  summary: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty()
  startDateTime: string;

  @IsString()
  @IsNotEmpty()
  endDateTime: string;

  @IsOptional()
  @IsString()
  calendarId?: string = 'primary';

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  attendees?: string[];
}
