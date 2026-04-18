import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { HaciendaService } from './hacienda.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Clinic } from '../auth/decorators/clinic.decorator';

@Controller('hacienda')
@UseGuards(JwtAuthGuard)
export class HaciendaController {
  constructor(private readonly haciendaService: HaciendaService) {}

  /**
   * POST /api/hacienda/token
   * Obtain a fresh OAuth token from Hacienda IDP.
   */
  @Post('token')
  getToken(@Clinic() clinicId: string) {
    return this.haciendaService.getOAuthToken(clinicId);
  }

  /**
   * POST /api/hacienda/submit
   * Submit an electronic document (invoice) to Hacienda.
   */
  @Post('submit')
  submitDocument(
    @Clinic() clinicId: string,
    @Body()
    body: {
      clave: string;
      fecha: string;
      emisor: { tipoIdentificacion: string; numeroIdentificacion: string };
      receptor?: { tipoIdentificacion: string; numeroIdentificacion: string };
      comprobanteXml: string;
    },
  ) {
    return this.haciendaService.submitDocument(clinicId, body);
  }

  /**
   * GET /api/hacienda/status/:clave
   * Check the status of a submitted document by its clave.
   */
  @Get('status/:clave')
  checkStatus(
    @Clinic() clinicId: string,
    @Param('clave') clave: string,
  ) {
    return this.haciendaService.checkDocumentStatus(clinicId, clave);
  }

  /**
   * GET /api/hacienda/exchange-rate
   * Fetch the current exchange rate from Hacienda.
   */
  @Get('exchange-rate')
  getExchangeRate() {
    return this.haciendaService.getExchangeRate();
  }

  /**
   * GET /api/hacienda/taxpayer/:identification
   * Look up taxpayer information by identification number.
   */
  @Get('taxpayer/:identification')
  getTaxpayerInfo(@Param('identification') identification: string) {
    return this.haciendaService.getTaxpayerInfo(identification);
  }

  /**
   * GET /api/hacienda/exemption/:authorization
   * Look up tax exemption information by authorization number.
   */
  @Get('exemption/:authorization')
  getExemptionInfo(@Param('authorization') authorization: string) {
    return this.haciendaService.getExemptionInfo(authorization);
  }
}
