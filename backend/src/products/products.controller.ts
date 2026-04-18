import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Clinic } from '../auth/decorators/clinic.decorator';
import { MongoIdValidationPipe } from '../common/pipes/mongo-id-validation.pipe';

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(
    @Clinic() clinicId: string,
    @Body() dto: CreateProductDto,
  ) {
    return this.productsService.create(clinicId, dto);
  }

  @Get()
  findAll(
    @Clinic() clinicId: string,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.productsService.findAll(clinicId, paginationDto);
  }

  @Get(':id')
  findOne(
    @Clinic() clinicId: string,
    @Param('id', MongoIdValidationPipe) id: string,
  ) {
    return this.productsService.findOne(clinicId, id);
  }

  @Patch(':id')
  update(
    @Clinic() clinicId: string,
    @Param('id', MongoIdValidationPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(clinicId, id, dto);
  }

  @Delete(':id')
  remove(
    @Clinic() clinicId: string,
    @Param('id', MongoIdValidationPipe) id: string,
  ) {
    return this.productsService.remove(clinicId, id);
  }

  @Patch(':id/cabys')
  updateCabysCode(
    @Clinic() clinicId: string,
    @Param('id', MongoIdValidationPipe) id: string,
    @Body('cabysCode') cabysCode: string,
  ) {
    return this.productsService.updateCabysCode(clinicId, id, cabysCode);
  }
}
