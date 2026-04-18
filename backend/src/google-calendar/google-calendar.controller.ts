import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GoogleCalendarService } from './google-calendar.service';
import { ListCalendarEventsDto } from './dto/list-calendar-events.dto';
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto';

@Controller('calendar')
@UseGuards(JwtAuthGuard)
export class GoogleCalendarController {
  constructor(private readonly calendarService: GoogleCalendarService) {}

  @Get('events')
  listEvents(@Request() req: any, @Query() query: ListCalendarEventsDto) {
    return this.calendarService.listEvents(req.user.userId, query);
  }

  @Post('events')
  createEvent(@Request() req: any, @Body() dto: CreateCalendarEventDto) {
    return this.calendarService.createEvent(req.user.userId, dto);
  }

  @Delete('events/:eventId')
  deleteEvent(@Request() req: any, @Param('eventId') eventId: string) {
    return this.calendarService.deleteEvent(req.user.userId, eventId);
  }

  @Get('status')
  getStatus(@Request() req: any) {
    return this.calendarService.getStatus(req.user.userId);
  }
}
