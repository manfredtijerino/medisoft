import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PatientFormTemplate } from './schemas/patient-form-template.schema';
import { CreateFormTemplateDto } from './dto/create-form-template.dto';
import { UpdateFormTemplateDto } from './dto/update-form-template.dto';

@Injectable()
export class FormTemplatesService {
  constructor(
    @InjectModel(PatientFormTemplate.name)
    private formTemplateModel: Model<PatientFormTemplate>,
  ) {}

  async create(
    clinicId: string,
    dto: CreateFormTemplateDto,
  ): Promise<PatientFormTemplate> {
    this.validateFieldKeysAndOrders(dto.fields);

    // Validate options required for select/multiselect
    for (const field of dto.fields) {
      if (
        (field.fieldType === 'select' || field.fieldType === 'multiselect') &&
        (!field.options || field.options.length === 0)
      ) {
        throw new BadRequestException(
          `Field "${field.fieldKey}" of type "${field.fieldType}" requires at least one option`,
        );
      }
    }

    const template = new this.formTemplateModel({ clinicId, ...dto });
    return template.save();
  }

  async findAll(clinicId: string): Promise<PatientFormTemplate[]> {
    return this.formTemplateModel
      .find({ clinicId, isActive: true })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(
    clinicId: string,
    id: string,
  ): Promise<PatientFormTemplate> {
    const template = await this.formTemplateModel.findOne({
      _id: id,
      clinicId,
    });
    if (!template) {
      throw new NotFoundException('Form template not found');
    }
    return template;
  }

  async update(
    clinicId: string,
    id: string,
    dto: UpdateFormTemplateDto,
  ): Promise<PatientFormTemplate> {
    if (dto.fields) {
      this.validateFieldKeysAndOrders(dto.fields);

      for (const field of dto.fields) {
        if (
          (field.fieldType === 'select' ||
            field.fieldType === 'multiselect') &&
          (!field.options || field.options.length === 0)
        ) {
          throw new BadRequestException(
            `Field "${field.fieldKey}" of type "${field.fieldType}" requires at least one option`,
          );
        }
      }
    }

    const template = await this.formTemplateModel.findOneAndUpdate(
      { _id: id, clinicId },
      { $set: dto },
      { new: true },
    );
    if (!template) {
      throw new NotFoundException('Form template not found');
    }
    return template;
  }

  async remove(clinicId: string, id: string): Promise<PatientFormTemplate> {
    const template = await this.formTemplateModel.findOneAndUpdate(
      { _id: id, clinicId },
      { $set: { isActive: false } },
      { new: true },
    );
    if (!template) {
      throw new NotFoundException('Form template not found');
    }
    return template;
  }

  async setDefault(
    clinicId: string,
    id: string,
  ): Promise<PatientFormTemplate> {
    // Verify the template exists
    const template = await this.formTemplateModel.findOne({
      _id: id,
      clinicId,
      isActive: true,
    });
    if (!template) {
      throw new NotFoundException('Form template not found');
    }

    // Unset previous default
    await this.formTemplateModel.updateMany(
      { clinicId, isDefault: true },
      { $set: { isDefault: false } },
    );

    // Set this one as default
    template.isDefault = true;
    return template.save();
  }

  private validateFieldKeysAndOrders(
    fields: { fieldKey: string; order: number }[],
  ): void {
    const fieldKeys = fields.map((f) => f.fieldKey);
    const uniqueKeys = new Set(fieldKeys);
    if (uniqueKeys.size !== fieldKeys.length) {
      throw new BadRequestException('Duplicate fieldKey values are not allowed');
    }

    const orders = fields.map((f) => f.order);
    const uniqueOrders = new Set(orders);
    if (uniqueOrders.size !== orders.length) {
      throw new BadRequestException('Duplicate order values are not allowed');
    }
  }
}
