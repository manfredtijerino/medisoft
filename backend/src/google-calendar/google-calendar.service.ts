import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { google } from 'googleapis';
import { User } from '../users/schemas/user.schema';
import { EncryptionUtil } from '../common/utils/encryption.util';

@Injectable()
export class GoogleCalendarService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private configService: ConfigService,
  ) {}

  private async getCalendarClient(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('+googleRefreshToken');
    if (!user || !user.googleRefreshToken) {
      throw new BadRequestException(
        'Google Calendar not connected. Please log in with Google first.',
      );
    }

    const encryptionKey = this.configService.get<string>('ENCRYPTION_KEY', '');
    const refreshToken = EncryptionUtil.decrypt(
      user.googleRefreshToken,
      encryptionKey,
    );

    const oauth2Client = new google.auth.OAuth2(
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
      this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
    );
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    return google.calendar({ version: 'v3', auth: oauth2Client });
  }

  async listEvents(
    userId: string,
    query: {
      timeMin?: string;
      timeMax?: string;
      maxResults?: number;
      calendarId?: string;
    },
  ) {
    const calendar = await this.getCalendarClient(userId);
    try {
      const response = await calendar.events.list({
        calendarId: query.calendarId || 'primary',
        timeMin: query.timeMin || new Date().toISOString(),
        timeMax: query.timeMax,
        maxResults: query.maxResults || 10,
        singleEvents: true,
        orderBy: 'startTime',
      });
      return response.data.items || [];
    } catch (error) {
      if (error.code === 401 || error.code === 403) {
        throw new UnauthorizedException(
          'Google Calendar access revoked. Please reconnect via Settings.',
        );
      }
      throw error;
    }
  }

  async createEvent(
    userId: string,
    eventData: {
      summary: string;
      description?: string;
      startDateTime: string;
      endDateTime: string;
      calendarId?: string;
      attendees?: string[];
    },
  ) {
    const calendar = await this.getCalendarClient(userId);
    try {
      const response = await calendar.events.insert({
        calendarId: eventData.calendarId || 'primary',
        requestBody: {
          summary: eventData.summary,
          description: eventData.description,
          start: { dateTime: eventData.startDateTime },
          end: { dateTime: eventData.endDateTime },
          attendees: eventData.attendees?.map((email) => ({ email })),
        },
      });
      return response.data;
    } catch (error) {
      if (error.code === 401 || error.code === 403) {
        throw new UnauthorizedException(
          'Google Calendar access revoked. Please reconnect via Settings.',
        );
      }
      throw error;
    }
  }

  async deleteEvent(
    userId: string,
    eventId: string,
    calendarId: string = 'primary',
  ) {
    const calendar = await this.getCalendarClient(userId);
    try {
      await calendar.events.delete({ calendarId, eventId });
      return { message: 'Event deleted successfully' };
    } catch (error) {
      if (error.code === 401 || error.code === 403) {
        throw new UnauthorizedException(
          'Google Calendar access revoked. Please reconnect via Settings.',
        );
      }
      throw error;
    }
  }

  async getStatus(userId: string) {
    const user = await this.userModel.findById(userId);
    return {
      connected: !!user?.googleRefreshToken,
      authProvider: user?.authProvider || 'local',
    };
  }
}
