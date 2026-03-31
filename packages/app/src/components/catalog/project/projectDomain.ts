import {
  PROJECT_DOMAIN_ROLE,
  PROJECT_DOMAIN_ROLE_ANNOTATION,
} from '@internal/plugin-catalog-extensions-common';
import { type Entity, isDomainEntity } from '@backstage/catalog-model';
import type { EntityFilter } from '@backstage/plugin-catalog-react';

export { PROJECT_DOMAIN_ROLE, PROJECT_DOMAIN_ROLE_ANNOTATION } from '@internal/plugin-catalog-extensions-common';

export const PROJECT_DOMAIN_KIND = 'Domain';

function normalizeProjectDomainRole(value: string | undefined): string {
  return value?.trim().toLocaleLowerCase('en-US') ?? '';
}

export function isProjectDomainEntity(entity: Entity): boolean {
  return (
    isDomainEntity(entity) &&
    normalizeProjectDomainRole(
      entity.metadata.annotations?.[PROJECT_DOMAIN_ROLE_ANNOTATION],
    ) === PROJECT_DOMAIN_ROLE
  );
}

export class ProjectDomainFilter implements EntityFilter {
  readonly value = PROJECT_DOMAIN_ROLE;

  getCatalogFilters() {
    return {
      kind: PROJECT_DOMAIN_KIND,
      [`metadata.annotations.${PROJECT_DOMAIN_ROLE_ANNOTATION}`]: this.value,
    };
  }

  filterEntity(entity: Entity): boolean {
    return isProjectDomainEntity(entity);
  }

  toQueryValue(): string {
    return this.value;
  }
}
