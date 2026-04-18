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
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Clinic } from '../auth/decorators/clinic.decorator';
import { MongoIdValidationPipe } from '../common/pipes/mongo-id-validation.pipe';
import { PaginationDto } from '../common/dto/pagination.dto';

@Controller('patients')
@UseGuards(JwtAuthGuard)
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post()
  create(
    @Clinic() clinicId: string,
    @Body() dto: CreatePatientDto,
  ) {
    return this.patientsService.create(clinicId, dto);
  }

  @Get()
  findAll(
    @Clinic() clinicId: string,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.patientsService.findAll(clinicId, paginationDto);
  }

  @Get('search')
  search(
    @Clinic() clinicId: string,
    @Query('q') query: string,
  ) {
    return this.patientsService.search(clinicId, query);
  }

  @Get(':id')
  findOne(
    @Clinic() clinicId: string,
    @Param('id', MongoIdValidationPipe) id: string,
  ) {
    return this.patientsService.findOne(clinicId, id);
  }

  @Patch(':id')
  update(
    @Clinic() clinicId: string,
    @Param('id', MongoIdValidationPipe) id: string,
    @Body() dto: UpdatePatientDto,
  ) {
    return this.patientsService.update(clinicId, id, dto);
  }

  @Delete(':id')
  remove(
    @Clinic() clinicId: string,
    @Param('id', MongoIdValidationPipe) id: string,
  ) {
    return this.patientsService.remove(clinicId, id);
  }

  @Patch(':id/deactivate')
  deactivate(
    @Clinic() clinicId: string,
    @Param('id', MongoIdValidationPipe) id: string,
  ) {
    return this.patientsService.deactivate(clinicId, id);
  }

  @Patch(':id/reactivate')
  reactivate(
    @Clinic() clinicId: string,
    @Param('id', MongoIdValidationPipe) id: string,
  ) {
    return this.patientsService.reactivate(clinicId, id);
  }

  @Get(':id/validate-hacienda')
  validateHacienda(
    @Clinic() clinicId: string,
    @Param('id', MongoIdValidationPipe) id: string,
  ) {
    return this.patientsService.validateHacienda(clinicId, id);
  }
}
