import { Controller, Get } from '@nestjs/common';
import { Connection } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';

@Controller('health')
export class AppController {
  constructor(@InjectConnection() private connection: Connection) {}

  @Get()
  healthCheck() {
    const dbState =
      this.connection.readyState === 1 ? 'connected' : 'disconnected';
    return {
      status: 'ok',
      db: dbState,
      timestamp: new Date().toISOString(),
    };
  }
}
