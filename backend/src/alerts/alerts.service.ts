import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Alert } from './schemas/alert.schema';

@Injectable()
export class AlertsService {
  constructor(
    @InjectModel(Alert.name) private readonly alertModel: Model<Alert>,
  ) {}

  async findAll(clinicId: string) {
    return this.alertModel
      .find({ clinicId, isDismissed: false })
      .sort({ createdAt: -1 })
      .exec();
  }

  async getUnreadCount(clinicId: string) {
    const count = await this.alertModel.countDocuments({
      clinicId,
      isRead: false,
      isDismissed: false,
    });
    return { count };
  }

  async markAsRead(clinicId: string, id: string) {
    const alert = await this.alertModel.findOneAndUpdate(
      { _id: id, clinicId },
      { $set: { isRead: true } },
      { new: true },
    );
    if (!alert) {
      throw new NotFoundException('Alert not found');
    }
    return alert;
  }

  async dismiss(clinicId: string, id: string) {
    const alert = await this.alertModel.findOneAndUpdate(
      { _id: id, clinicId },
      { $set: { isDismissed: true } },
      { new: true },
    );
    if (!alert) {
      throw new NotFoundException('Alert not found');
    }
    return alert;
  }

  async remove(clinicId: string, id: string) {
    const alert = await this.alertModel.findOneAndDelete({
      _id: id,
      clinicId,
    });
    if (!alert) {
      throw new NotFoundException('Alert not found');
    }
    return { message: 'Alert deleted successfully' };
  }

  async createAlert(data: {
    clinicId: string;
    type: string;
    title: string;
    message?: string;
    referenceType?: string;
    referenceId?: string;
    severity?: string;
  }) {
    return this.alertModel.create(data);
  }

  async findExistingAlert(
    clinicId: string,
    referenceType: string,
    referenceId: string,
    type: string,
  ) {
    return this.alertModel.findOne({
      clinicId,
      referenceType,
      referenceId,
      type,
      isDismissed: false,
    });
  }

  async dismissByReference(
    clinicId: string,
    referenceType: string,
    referenceId: string,
  ) {
    await this.alertModel.updateMany(
      { clinicId, referenceType, referenceId, isDismissed: false },
      { $set: { isDismissed: true } },
    );
  }
}
