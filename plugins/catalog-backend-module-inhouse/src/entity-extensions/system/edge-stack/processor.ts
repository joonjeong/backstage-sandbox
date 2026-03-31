import type { LoggerService } from '@backstage/backend-plugin-api';
import type { Config } from '@backstage/config';
import type {
  CatalogProcessor,
  CatalogProcessorCache,
  CatalogProcessorEmit,
  LocationSpec,
} from '@backstage/plugin-catalog-node';
import type { Entity } from '@backstage/catalog-model';
import { isEdgeStackSystemEntity } from './types';
import {
  postProcessEdgeStackSystemEntity,
  preProcessEdgeStackSystemEntity,
  validateEdgeStackSystemEntity,
} from './utils';

export class EdgeStackSystemProcessor implements CatalogProcessor {
  constructor(_config: Config, private readonly logger: LoggerService) {}

  getProcessorName(): string {
    return 'CatalogEdgeStackSystemProcessor';
  }

  async validateEntityKind(entity: Entity): Promise<boolean> {
    return validateEdgeStackSystemEntity(entity);
  }

  async preProcessEntity(
    entity: Entity,
    _location: LocationSpec,
    _emit: CatalogProcessorEmit,
    _originLocation: LocationSpec,
    _cache: CatalogProcessorCache,
  ): Promise<Entity> {
    if (isEdgeStackSystemEntity(entity)) {
      return preProcessEdgeStackSystemEntity(entity);
    }

    return entity;
  }

  async postProcessEntity(
    entity: Entity,
    _location: LocationSpec,
    emit: CatalogProcessorEmit,
    _cache: CatalogProcessorCache,
  ): Promise<Entity> {
    if (isEdgeStackSystemEntity(entity)) {
      return postProcessEdgeStackSystemEntity(entity, emit, this.logger);
    }

    return entity;
  }
}
