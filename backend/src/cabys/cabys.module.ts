import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CabysController } from './cabys.controller';
import { CabysService } from './cabys.service';
import { CabysCache, CabysCacheSchema } from './schemas/cabys-cache.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CabysCache.name, schema: CabysCacheSchema },
    ]),
  ],
  controllers: [CabysController],
  providers: [CabysService],
  exports: [CabysService],
})
export class CabysModule {}
