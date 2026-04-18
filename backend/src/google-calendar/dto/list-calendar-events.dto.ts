import { IsOptional, IsString, IsNumber, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ListCalendarEventsDto {
  @IsOptional()
  @IsString()
  timeMin?: string;

  @IsOptional()
  @IsString()
  timeMax?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  maxResults?: number = 10;

  @IsOptional()
  @IsString()
  calendarId?: string = 'primary';
}
