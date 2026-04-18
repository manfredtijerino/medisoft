import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Clinic } from '../auth/decorators/clinic.decorator';
import { AnalyticsService } from './analytics.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('sales')
  getSales(
    @Clinic() clinicId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsService.getSales(clinicId, query);
  }

  @Get('patients')
  getPatients(
    @Clinic() clinicId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsService.getPatients(clinicId, query);
  }

  @Get('top-products')
  getTopProducts(
    @Clinic() clinicId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsService.getTopProducts(
      clinicId,
      query,
      parseInt(query.limit || '10'),
    );
  }

  @Get('top-patients')
  getTopPatients(
    @Clinic() clinicId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsService.getTopPatients(
      clinicId,
      query,
      parseInt(query.limit || '10'),
    );
  }

  @Get('summary')
  getSummary(
    @Clinic() clinicId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsService.getSummary(clinicId, query);
  }
}
