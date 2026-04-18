import { IsOptional, IsString, IsIn, IsDateString } from 'class-validator';

export class AnalyticsQueryDto {
  @IsOptional()
  @IsString()
  @IsIn([
    'today',
    'thisWeek',
    'lastWeek',
    'last30days',
    'last3months',
    'last6months',
    'last12months',
    'custom',
  ])
  range?: string = 'last30days';

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  limit?: string = '10';
}
