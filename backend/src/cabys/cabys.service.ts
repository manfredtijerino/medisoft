import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios from 'axios';
import { CabysCache } from './schemas/cabys-cache.schema';

const HACIENDA_CABYS_URL = 'https://api.hacienda.go.cr/fe/cabys';
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

@Injectable()
export class CabysService {
  private readonly logger = new Logger(CabysService.name);

  constructor(
    @InjectModel(CabysCache.name)
    private cabysCacheModel: Model<CabysCache>,
  ) {}

  async search(query: string, top: number = 10) {
    // Check cache first with case-insensitive regex on description
    const cached = await this.cabysCacheModel
      .find({ description: { $regex: query, $options: 'i' } })
      .limit(top)
      .lean()
      .exec();

    if (cached.length >= top) {
      return cached;
    }

    // Not enough cached results — call Hacienda API
    try {
      const response = await axios.get(HACIENDA_CABYS_URL, {
        params: { q: query, top },
        timeout: 10000,
      });

      const results = response.data?.cabys || response.data || [];

      if (Array.isArray(results) && results.length > 0) {
        await this.upsertResults(results);
        return results;
      }
    } catch (error) {
      this.logger.warn(
        `Hacienda CABYS API error: ${error.message}. Returning cached results.`,
      );
    }

    // Return whatever we have from cache
    return cached;
  }

  async findByCode(code: string) {
    // Check cache first
    const cached = await this.cabysCacheModel
      .findOne({ code })
      .lean()
      .exec();

    if (cached) {
      return cached;
    }

    // Cache miss — call Hacienda API
    try {
      const response = await axios.get(HACIENDA_CABYS_URL, {
        params: { q: code, top: 1 },
        timeout: 10000,
      });

      const results = response.data?.cabys || response.data || [];

      if (Array.isArray(results) && results.length > 0) {
        await this.upsertResults(results);
        const match = results.find((r: any) => r.codigo === code || r.code === code);
        return match || results[0];
      }
    } catch (error) {
      this.logger.warn(
        `Hacienda CABYS API error: ${error.message}. No cached result available.`,
      );
    }

    return null;
  }

  private async upsertResults(results: any[]) {
    const bulkOps = results.map((item) => ({
      updateOne: {
        filter: { code: item.codigo || item.code },
        update: {
          $set: {
            code: item.codigo || item.code,
            description: item.descripcion || item.description,
            taxRate: item.impuesto ?? item.taxRate ?? 0,
            category: item.categorias || item.category || '',
            fetchedAt: new Date(),
            expiresAt: new Date(Date.now() + CACHE_TTL_MS),
          },
        },
        upsert: true,
      },
    }));

    try {
      await this.cabysCacheModel.bulkWrite(bulkOps);
    } catch (error) {
      this.logger.error(`Failed to cache CABYS results: ${error.message}`);
    }
  }
}
