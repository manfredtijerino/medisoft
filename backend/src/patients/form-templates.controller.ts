import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { FormTemplatesService } from './form-templates.service';
import { CreateFormTemplateDto } from './dto/create-form-template.dto';
import { UpdateFormTemplateDto } from './dto/update-form-template.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Clinic } from '../auth/decorators/clinic.decorator';
import { MongoIdValidationPipe } from '../common/pipes/mongo-id-validation.pipe';

@Controller('form-templates')
@UseGuards(JwtAuthGuard)
export class FormTemplatesController {
  constructor(private readonly formTemplatesService: FormTemplatesService) {}

  @Post()
  create(
    @Clinic() clinicId: string,
    @Body() dto: CreateFormTemplateDto,
  ) {
    return this.formTemplatesService.create(clinicId, dto);
  }

  @Get()
  findAll(@Clinic() clinicId: string) {
    return this.formTemplatesService.findAll(clinicId);
  }

  @Get(':id')
  findOne(
    @Clinic() clinicId: string,
    @Param('id', MongoIdValidationPipe) id: string,
  ) {
    return this.formTemplatesService.findOne(clinicId, id);
  }

  @Patch(':id')
  update(
    @Clinic() clinicId: string,
    @Param('id', MongoIdValidationPipe) id: string,
    @Body() dto: UpdateFormTemplateDto,
  ) {
    return this.formTemplatesService.update(clinicId, id, dto);
  }

  @Delete(':id')
  remove(
    @Clinic() clinicId: string,
    @Param('id', MongoIdValidationPipe) id: string,
  ) {
    return this.formTemplatesService.remove(clinicId, id);
  }

  @Patch(':id/default')
  setDefault(
    @Clinic() clinicId: string,
    @Param('id', MongoIdValidationPipe) id: string,
  ) {
    return this.formTemplatesService.setDefault(clinicId, id);
  }
}
