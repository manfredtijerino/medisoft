import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios from 'axios';
import { Patient } from './schemas/patient.schema';
import { PatientFormTemplate } from './schemas/patient-form-template.schema';
import { Invoice } from '../invoices/schemas/invoice.schema';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class PatientsService {
  constructor(
    @InjectModel(Patient.name)
    private patientModel: Model<Patient>,
    @InjectModel(PatientFormTemplate.name)
    private formTemplateModel: Model<PatientFormTemplate>,
    @InjectModel(Invoice.name)
    private invoiceModel: Model<Invoice>,
  ) {}

  async create(clinicId: string, dto: CreatePatientDto): Promise<Patient> {
    if (dto.formTemplateId && dto.customFields) {
      await this.validateCustomFields(
        clinicId,
        dto.formTemplateId,
        dto.customFields,
      );
    }

    const patient = new this.patientModel({ clinicId, ...dto });
    return patient.save();
  }

  async findAll(
    clinicId: string,
    paginationDto: PaginationDto,
  ): Promise<{
    data: Patient[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 20 } = paginationDto;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.patientModel
        .find({ clinicId, isActive: true })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.patientModel.countDocuments({ clinicId, isActive: true }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(clinicId: string, id: string): Promise<Patient> {
    const patient = await this.patientModel.findOne({
      _id: id,
      clinicId,
      isActive: true,
    });
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }
    return patient;
  }

  async update(
    clinicId: string,
    id: string,
    dto: UpdatePatientDto,
  ): Promise<Patient> {
    const existingPatient = await this.patientModel.findOne({
      _id: id,
      clinicId,
    });
    if (!existingPatient) {
      throw new NotFoundException('Patient not found');
    }

    if (dto.customFields) {
      const templateId =
        dto.formTemplateId ||
        (existingPatient.formTemplateId
          ? existingPatient.formTemplateId.toString()
          : null);

      if (templateId) {
        await this.validateCustomFields(clinicId, templateId, dto.customFields);
      }
    }

    const patient = await this.patientModel.findOneAndUpdate(
      { _id: id, clinicId },
      { $set: dto },
      { new: true },
    );
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }
    return patient;
  }

  async remove(clinicId: string, id: string): Promise<Patient> {
    // Check for linked invoices
    const invoiceCount = await this.invoiceModel.countDocuments({
      clinicId,
      'receiver.identificationNumber': (await this.patientModel.findOne({ _id: id, clinicId }))?.identificationNumber,
    });

    if (invoiceCount > 0) {
      throw new BadRequestException(
        `Cannot delete patient with existing invoices. This patient has ${invoiceCount} invoice(s). Deactivate the patient instead.`,
      );
    }

    const patient = await this.patientModel.findOneAndUpdate(
      { _id: id, clinicId },
      { $set: { isActive: false } },
      { new: true },
    );
    if (!patient) throw new NotFoundException('Patient not found');
    return patient;
  }

  async deactivate(clinicId: string, id: string) {
    const patient = await this.patientModel.findOneAndUpdate(
      { _id: id, clinicId },
      { $set: { isActive: false } },
      { new: true },
    );
    if (!patient) throw new NotFoundException('Patient not found');

    // Cascade: deactivate medical records and consultations
    await this.patientModel.db.collection('medicalrecords').updateMany(
      { clinicId: patient.clinicId, patientId: patient._id },
      { $set: { isActive: false } },
    );
    await this.patientModel.db.collection('consultations').updateMany(
      { clinicId: patient.clinicId, patientId: patient._id },
      { $set: { isActive: false } },
    );

    return { message: 'Patient and related records deactivated', patient };
  }

  async reactivate(clinicId: string, id: string) {
    const patient = await this.patientModel.findOneAndUpdate(
      { _id: id, clinicId, isActive: false },
      { $set: { isActive: true } },
      { new: true },
    );
    if (!patient) throw new NotFoundException('Patient not found or already active');

    // Cascade: reactivate medical records and consultations
    await this.patientModel.db.collection('medicalrecords').updateMany(
      { clinicId: patient.clinicId, patientId: patient._id },
      { $set: { isActive: true } },
    );
    await this.patientModel.db.collection('consultations').updateMany(
      { clinicId: patient.clinicId, patientId: patient._id },
      { $set: { isActive: true } },
    );

    return { message: 'Patient and related records reactivated', patient };
  }

  async search(
    clinicId: string,
    query: string,
  ): Promise<Patient[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const regex = new RegExp(query.trim(), 'i');

    return this.patientModel
      .find({
        clinicId,
        isActive: true,
        $or: [
          { identificationNumber: regex },
          { firstName: regex },
          { lastName: regex },
          { email: regex },
        ],
      })
      .limit(50)
      .exec();
  }

  async validateHacienda(
    clinicId: string,
    id: string,
  ): Promise<any> {
    const patient = await this.findOne(clinicId, id);

    try {
      const response = await axios.get(
        `https://api.hacienda.go.cr/fe/ae?identificacion=${patient.identificationNumber}`,
      );
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new NotFoundException(
          'Taxpayer not found in Hacienda registry',
        );
      }
      throw new BadRequestException(
        `Hacienda validation failed: ${error.message}`,
      );
    }
  }

  private async validateCustomFields(
    clinicId: string,
    formTemplateId: string,
    customFields: Record<string, any>,
  ): Promise<void> {
    const template = await this.formTemplateModel.findOne({
      _id: formTemplateId,
      clinicId,
      isActive: true,
    });

    if (!template) {
      throw new BadRequestException('Form template not found or inactive');
    }

    const fieldMap = new Map(
      template.fields.map((f) => [f.fieldKey, f]),
    );

    // Reject unknown keys
    for (const key of Object.keys(customFields)) {
      if (!fieldMap.has(key)) {
        throw new BadRequestException(
          `Unknown custom field: "${key}"`,
        );
      }
    }

    // Validate required fields and types
    for (const field of template.fields) {
      const value = customFields[field.fieldKey];

      if (field.required && (value === undefined || value === null || value === '')) {
        throw new BadRequestException(
          `Custom field "${field.fieldKey}" is required`,
        );
      }

      if (value === undefined || value === null) {
        continue;
      }

      switch (field.fieldType) {
        case 'text':
        case 'textarea':
          if (typeof value !== 'string') {
            throw new BadRequestException(
              `Custom field "${field.fieldKey}" must be a string`,
            );
          }
          break;

        case 'number':
          if (typeof value !== 'number') {
            throw new BadRequestException(
              `Custom field "${field.fieldKey}" must be a number`,
            );
          }
          break;

        case 'date':
          if (typeof value !== 'string' || isNaN(Date.parse(value))) {
            throw new BadRequestException(
              `Custom field "${field.fieldKey}" must be a valid ISO date string`,
            );
          }
          break;

        case 'select':
          if (!field.options.includes(value)) {
            throw new BadRequestException(
              `Custom field "${field.fieldKey}" must be one of: ${field.options.join(', ')}`,
            );
          }
          break;

        case 'multiselect':
          if (!Array.isArray(value)) {
            throw new BadRequestException(
              `Custom field "${field.fieldKey}" must be an array`,
            );
          }
          for (const v of value) {
            if (!field.options.includes(v)) {
              throw new BadRequestException(
                `Custom field "${field.fieldKey}" contains invalid option: "${v}"`,
              );
            }
          }
          break;

        case 'boolean':
          if (typeof value !== 'boolean') {
            throw new BadRequestException(
              `Custom field "${field.fieldKey}" must be a boolean`,
            );
          }
          break;

        case 'email':
          if (
            typeof value !== 'string' ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
          ) {
            throw new BadRequestException(
              `Custom field "${field.fieldKey}" must be a valid email`,
            );
          }
          break;

        case 'phone':
          if (
            typeof value !== 'string' ||
            !/^\d{7,15}$/.test(value)
          ) {
            throw new BadRequestException(
              `Custom field "${field.fieldKey}" must be a phone number (7-15 digits)`,
            );
          }
          break;
      }
    }
  }
}
