import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ClinicSettingsService } from './clinic-settings.service';
import { UpdateClinicSettingsDto } from './dto/update-clinic-settings.dto';
import { LinkHaciendaDto } from './dto/link-hacienda.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Clinic } from '../auth/decorators/clinic.decorator';

@Controller('clinic-settings')
@UseGuards(JwtAuthGuard)
export class ClinicSettingsController {
  constructor(private readonly clinicSettingsService: ClinicSettingsService) {}

  @Get()
  findOne(@Clinic() clinicId: string) {
    return this.clinicSettingsService.findByClinicId(clinicId);
  }

  @Patch()
  update(
    @Clinic() clinicId: string,
    @Body() dto: UpdateClinicSettingsDto,
  ) {
    return this.clinicSettingsService.update(clinicId, dto);
  }

  @Post('logo')
  @UseInterceptors(FileInterceptor('logo'))
  uploadLogo(
    @Clinic() clinicId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.clinicSettingsService.uploadLogo(clinicId, file);
  }

  @Get('logo')
  async getLogo(@Clinic() clinicId: string, @Res() res: Response) {
    const { data, mimeType } = await this.clinicSettingsService.getLogo(clinicId);
    res.set('Content-Type', mimeType);
    res.send(data);
  }

  @Delete('logo')
  removeLogo(@Clinic() clinicId: string) {
    return this.clinicSettingsService.removeLogo(clinicId);
  }

  @Post('hacienda/link')
  @UseInterceptors(FileInterceptor('cryptoKeyP12'))
  linkHacienda(
    @Clinic() clinicId: string,
    @Body() dto: LinkHaciendaDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.clinicSettingsService.linkHacienda(clinicId, dto, file);
  }

  @Post('hacienda/test')
  testHaciendaConnection(@Clinic() clinicId: string) {
    return this.clinicSettingsService.testHaciendaConnection(clinicId);
  }

  @Post('hacienda/unlink')
  unlinkHacienda(@Clinic() clinicId: string) {
    return this.clinicSettingsService.unlinkHacienda(clinicId);
  }
}
