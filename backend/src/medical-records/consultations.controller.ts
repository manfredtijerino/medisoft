import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ConsultationsService } from './consultations.service';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { UpdateConsultationDto } from './dto/update-consultation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Clinic } from '../auth/decorators/clinic.decorator';
import { MongoIdValidationPipe } from '../common/pipes/mongo-id-validation.pipe';
import { PaginationDto } from '../common/dto/pagination.dto';

@Controller('patients/:patientId/consultations')
@UseGuards(JwtAuthGuard)
export class ConsultationsController {
  constructor(
    private readonly consultationsService: ConsultationsService,
  ) {}

  @Post()
  create(
    @Clinic() clinicId: string,
    @Param('patientId', MongoIdValidationPipe) patientId: string,
    @Body() dto: CreateConsultationDto,
  ) {
    return this.consultationsService.create(clinicId, patientId, dto);
  }

  @Get()
  findAll(
    @Clinic() clinicId: string,
    @Param('patientId', MongoIdValidationPipe) patientId: string,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.consultationsService.findAll(
      clinicId,
      patientId,
      paginationDto,
    );
  }

  @Get(':id')
  findOne(
    @Clinic() clinicId: string,
    @Param('patientId', MongoIdValidationPipe) patientId: string,
    @Param('id', MongoIdValidationPipe) id: string,
  ) {
    return this.consultationsService.findOne(clinicId, patientId, id);
  }

  @Patch(':id')
  update(
    @Clinic() clinicId: string,
    @Param('patientId', MongoIdValidationPipe) patientId: string,
    @Param('id', MongoIdValidationPipe) id: string,
    @Body() dto: UpdateConsultationDto,
  ) {
    return this.consultationsService.update(
      clinicId,
      patientId,
      id,
      dto,
    );
  }

  @Delete(':id')
  remove(
    @Clinic() clinicId: string,
    @Param('patientId', MongoIdValidationPipe) patientId: string,
    @Param('id', MongoIdValidationPipe) id: string,
  ) {
    return this.consultationsService.remove(clinicId, patientId, id);
  }
}
