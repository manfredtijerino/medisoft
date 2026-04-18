import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Consultation } from './schemas/consultation.schema';
import { Patient } from '../patients/schemas/patient.schema';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { UpdateConsultationDto } from './dto/update-consultation.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class ConsultationsService {
  constructor(
    @InjectModel(Consultation.name)
    private consultationModel: Model<Consultation>,
    @InjectModel(Patient.name)
    private patientModel: Model<Patient>,
  ) {}

  async create(
    clinicId: string,
    patientId: string,
    dto: CreateConsultationDto,
  ): Promise<Consultation> {
    const patient = await this.patientModel.findOne({
      _id: patientId,
      clinicId,
    });
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    const consultation = new this.consultationModel({
      clinicId,
      patientId,
      ...dto,
    });
    return consultation.save();
  }

  async findAll(
    clinicId: string,
    patientId: string,
    paginationDto: PaginationDto,
  ): Promise<{
    data: Consultation[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 20 } = paginationDto;
    const skip = (page - 1) * limit;

    const filter = { clinicId, patientId, isActive: true };

    const [data, total] = await Promise.all([
      this.consultationModel
        .find(filter)
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.consultationModel.countDocuments(filter),
    ]);

    return { data, total, page, limit };
  }

  async findOne(
    clinicId: string,
    patientId: string,
    id: string,
  ): Promise<Consultation> {
    const consultation = await this.consultationModel.findOne({
      _id: id,
      clinicId,
      patientId,
      isActive: true,
    });
    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }
    return consultation;
  }

  async update(
    clinicId: string,
    patientId: string,
    id: string,
    dto: UpdateConsultationDto,
  ): Promise<Consultation> {
    const consultation = await this.consultationModel.findOneAndUpdate(
      { _id: id, clinicId, patientId },
      { $set: dto },
      { new: true },
    );
    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }
    return consultation;
  }

  async remove(
    clinicId: string,
    patientId: string,
    id: string,
  ): Promise<Consultation> {
    const consultation = await this.consultationModel.findOneAndUpdate(
      { _id: id, clinicId, patientId },
      { $set: { isActive: false } },
      { new: true },
    );
    if (!consultation) {
      throw new NotFoundException('Consultation not found');
    }
    return consultation;
  }
}
