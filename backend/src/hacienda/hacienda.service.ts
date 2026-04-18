import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ClinicSettingsService } from '../clinic-settings/clinic-settings.service';

@Injectable()
export class HaciendaService {
  private readonly logger = new Logger(HaciendaService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly clinicSettingsService: ClinicSettingsService,
  ) {}

  /**
   * Get the Hacienda API base URL based on the clinic's environment setting.
   */
  private getApiUrl(environment: string): string {
    return environment === 'production'
      ? this.configService.get<string>('HACIENDA_API_PRODUCTION', '')
      : this.configService.get<string>('HACIENDA_API_STAGING', '');
  }

  /**
   * Get the IDP (Identity Provider) URL for OAuth token requests.
   */
  private getIdpUrl(environment: string): string {
    return environment === 'production'
      ? this.configService.get<string>('HACIENDA_IDP_PRODUCTION', '')
      : this.configService.get<string>('HACIENDA_IDP_STAGING', '');
  }

  /**
   * Authenticate with Hacienda IDP and obtain an OAuth access token.
   */
  async getOAuthToken(clinicId: string): Promise<string> {
    const settings = await this.clinicSettingsService.findByClinicId(clinicId);
    const { hacienda } = settings;

    // Return cached token if still valid (with 5-minute buffer)
    if (
      hacienda.cachedToken &&
      hacienda.tokenExpiresAt &&
      new Date(hacienda.tokenExpiresAt).getTime() > Date.now() + 5 * 60 * 1000
    ) {
      return hacienda.cachedToken;
    }

    const idpUrl = this.getIdpUrl(hacienda.environment);

    const params = new URLSearchParams({
      grant_type: 'password',
      client_id: 'api-stag',
      username: hacienda.atvUsername,
      password: hacienda.atvPassword,
    });

    try {
      const response = await axios.post(idpUrl, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      const { access_token, expires_in } = response.data;
      const tokenExpiresAt = new Date(Date.now() + expires_in * 1000);

      // Cache the token in clinic settings
      await this.clinicSettingsService.update(clinicId, {
        hacienda: {
          ...hacienda,
          cachedToken: access_token,
          tokenExpiresAt,
          lastTokenAt: new Date(),
        },
      } as any);

      this.logger.log(`OAuth token obtained for clinic ${clinicId}`);
      return access_token;
    } catch (error) {
      this.logger.error(`Failed to obtain OAuth token: ${error.message}`);
      throw error;
    }
  }

  /**
   * Submit an electronic document (invoice) to Hacienda.
   */
  async submitDocument(
    clinicId: string,
    document: {
      clave: string;
      fecha: string;
      emisor: { tipoIdentificacion: string; numeroIdentificacion: string };
      receptor?: { tipoIdentificacion: string; numeroIdentificacion: string };
      comprobanteXml: string;
    },
  ) {
    const settings = await this.clinicSettingsService.findByClinicId(clinicId);
    const token = await this.getOAuthToken(clinicId);
    const apiUrl = this.getApiUrl(settings.hacienda.environment);

    try {
      const response = await axios.post(
        `${apiUrl}/recepcion`,
        document,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      this.logger.log(`Document ${document.clave} submitted successfully`);
      return {
        status: response.status,
        clave: document.clave,
        message: 'Document submitted to Hacienda',
      };
    } catch (error) {
      this.logger.error(`Failed to submit document: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check the status of a previously submitted document.
   */
  async checkDocumentStatus(clinicId: string, clave: string) {
    const settings = await this.clinicSettingsService.findByClinicId(clinicId);
    const token = await this.getOAuthToken(clinicId);
    const apiUrl = this.getApiUrl(settings.hacienda.environment);

    try {
      const response = await axios.get(
        `${apiUrl}/recepcion/${clave}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to check document status: ${error.message}`);
      throw error;
    }
  }

  /**
   * Fetch the current exchange rate from Hacienda indicators API.
   */
  async getExchangeRate() {
    try {
      const response = await axios.get(
        'https://api.hacienda.go.cr/indicadores/tc',
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch exchange rate: ${error.message}`);
      throw error;
    }
  }

  /**
   * Look up taxpayer information by identification number.
   */
  async getTaxpayerInfo(identification: string) {
    try {
      const response = await axios.get(
        `https://api.hacienda.go.cr/fe/ae?identificacion=${identification}`,
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch taxpayer info: ${error.message}`);
      throw error;
    }
  }

  /**
   * Look up tax exemption information by authorization number.
   */
  async getExemptionInfo(authorization: string) {
    try {
      const response = await axios.get(
        `https://api.hacienda.go.cr/fe/ex?autorizacion=${authorization}`,
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch exemption info: ${error.message}`);
      throw error;
    }
  }
}
