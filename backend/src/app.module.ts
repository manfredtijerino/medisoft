import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ClinicSettingsModule } from './clinic-settings/clinic-settings.module';
import { HaciendaModule } from './hacienda/hacienda.module';
import { CabysModule } from './cabys/cabys.module';
import { ProductsModule } from './products/products.module';
import { PatientsModule } from './patients/patients.module';
import { InvoicesModule } from './invoices/invoices.module';
import { MedicalRecordsModule } from './medical-records/medical-records.module';
import { GoogleCalendarModule } from './google-calendar/google-calendar.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { PatientScheduleModule } from './schedule/patient-schedule.module';
import { AlertsModule } from './alerts/alerts.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    ClinicSettingsModule,
    HaciendaModule,
    CabysModule,
    ProductsModule,
    PatientsModule,
    InvoicesModule,
    MedicalRecordsModule,
    GoogleCalendarModule,
    AnalyticsModule,
    PatientScheduleModule,
    AlertsModule,
    PaymentsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
