import type { LoggerService } from '@backstage/backend-plugin-api';
import type { Config } from '@backstage/config';
import type { LocationSpec } from '@backstage/plugin-catalog-common';
import type {
  CatalogProcessor,
  CatalogProcessorCache,
  CatalogProcessorEmit,
} from '@backstage/plugin-catalog-node';
import type { Entity } from '@backstage/catalog-model';
import { isProjectDomainEntity } from './types';
import {
  postProcessProjectAwareComponentEntity,
  postProcessProjectDomainEntity,
  preProcessProjectAwareComponentEntity,
  preProcessProjectDomainEntity,
  validateProjectDomainEntity,
} from './utils';

export class ProjectDomainProcessor implements CatalogProcessor {
  constructor(_config: Config, private readonly logger: LoggerService) {}

  getProcessorName(): string {
    return 'CatalogProjectDomainProcessor';
  }

  async validateEntityKind(entity: Entity): Promise<boolean> {
    return validateProjectDomainEntity(entity);
  }

  async preProcessEntity(
    entity: Entity,
    _location: LocationSpec,
    _emit: CatalogProcessorEmit,
    _originLocation: LocationSpec,
    _cache: CatalogProcessorCache,
  ): Promise<Entity> {
    if (isProjectDomainEntity(entity)) {
      return preProcessProjectDomainEntity(entity);
    }

    return preProcessProjectAwareComponentEntity(entity);
  }

  async postProcessEntity(
    entity: Entity,
    _location: LocationSpec,
    emit: CatalogProcessorEmit,
    _cache: CatalogProcessorCache,
  ): Promise<Entity> {
    if (isProjectDomainEntity(entity)) {
      return postProcessProjectDomainEntity(entity, emit, this.logger);
    }

    return postProcessProjectAwareComponentEntity(entity, emit, this.logger);
  }
}
