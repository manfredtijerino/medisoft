import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product } from './schemas/product.schema';
import { Invoice } from '../invoices/schemas/invoice.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CabysService } from '../cabys/cabys.service';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name)
    private productModel: Model<Product>,
    @InjectModel(Invoice.name)
    private invoiceModel: Model<Invoice>,
    private readonly cabysService: CabysService,
  ) {}

  async create(clinicId: string, dto: CreateProductDto): Promise<Product> {
    const cabysResult = await this.cabysService.findByCode(dto.cabysCode);
    const cabysDescription = cabysResult
      ? cabysResult.descripcion || cabysResult.description || ''
      : '';

    const product = new this.productModel({
      ...dto,
      clinicId,
      cabysDescription,
    });

    return product.save();
  }

  async findAll(clinicId: string, paginationDto: PaginationDto) {
    const page = paginationDto.page ?? 1;
    const limit = paginationDto.limit ?? 20;
    const search = paginationDto.search;
    const skip = (page - 1) * limit;

    const filter: any = { clinicId, isActive: true };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { cabysCode: { $regex: search, $options: 'i' } },
        { productCode: { $regex: search, $options: 'i' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.productModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.productModel.countDocuments(filter),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(clinicId: string, id: string): Promise<Product> {
    const product = await this.productModel
      .findOne({ _id: id, clinicId, isActive: true })
      .lean()
      .exec();

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product as Product;
  }

  async update(
    clinicId: string,
    id: string,
    dto: UpdateProductDto,
  ): Promise<Product> {
    const updateData: any = { ...dto };

    // If cabysCode changed, re-validate and update description
    if (dto.cabysCode) {
      const cabysResult = await this.cabysService.findByCode(dto.cabysCode);
      updateData.cabysDescription = cabysResult
        ? cabysResult.descripcion || cabysResult.description || ''
        : '';
    }

    const product = await this.productModel
      .findOneAndUpdate({ _id: id, clinicId }, { $set: updateData }, { new: true })
      .lean()
      .exec();

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product as Product;
  }

  async remove(clinicId: string, id: string): Promise<Product> {
    const invoiceCount = await this.invoiceModel.countDocuments({
      clinicId,
      'items.productId': id,
    });

    if (invoiceCount > 0) {
      throw new BadRequestException(
        `Cannot delete product used in existing invoices. This product appears in ${invoiceCount} invoice(s). Deactivate it instead.`,
      );
    }

    const product = await this.productModel
      .findOneAndUpdate(
        { _id: id, clinicId },
        { $set: { isActive: false } },
        { new: true },
      )
      .lean()
      .exec();
    if (!product) throw new NotFoundException('Product not found');
    return product as Product;
  }

  async updateCabysCode(
    clinicId: string,
    id: string,
    cabysCode: string,
  ): Promise<Product> {
    if (!cabysCode || cabysCode.length !== 13) {
      throw new BadRequestException('CABYS code must be exactly 13 characters');
    }

    const cabysResult = await this.cabysService.findByCode(cabysCode);
    const cabysDescription = cabysResult
      ? cabysResult.descripcion || cabysResult.description || ''
      : '';

    const product = await this.productModel
      .findOneAndUpdate(
        { _id: id, clinicId },
        { $set: { cabysCode, cabysDescription } },
        { new: true },
      )
      .lean()
      .exec();

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product as Product;
  }
}
