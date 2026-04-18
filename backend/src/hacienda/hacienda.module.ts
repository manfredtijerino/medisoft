import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HaciendaController } from './hacienda.controller';
import { HaciendaService } from './hacienda.service';
import { HaciendaKeyService } from './hacienda-key.service';
import { HaciendaXmlService } from './hacienda-xml.service';
import { ClinicSettingsModule } from '../clinic-settings/clinic-settings.module';
import {
  ClinicSettings,
  ClinicSettingsSchema,
} from '../clinic-settings/schemas/clinic-settings.schema';

@Module({
  imports: [
    ClinicSettingsModule,
    MongooseModule.forFeature([
      { name: ClinicSettings.name, schema: ClinicSettingsSchema },
    ]),
  ],
  controllers: [HaciendaController],
  providers: [HaciendaService, HaciendaKeyService, HaciendaXmlService],
  exports: [HaciendaService, HaciendaKeyService, HaciendaXmlService],
})
export class HaciendaModule {}
