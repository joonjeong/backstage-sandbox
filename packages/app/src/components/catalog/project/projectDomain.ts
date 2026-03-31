import type { Entity } from '@backstage/catalog-model';
import type { EntityFilter } from '@backstage/plugin-catalog-react';

export const PROJECT_DOMAIN_KIND = 'Domain';
export const PROJECT_DOMAIN_ROLE_ANNOTATION = 'kabang.cloud/domain-role';
export const PROJECT_DOMAIN_ROLE = 'project';

function normalizeProjectDomainRole(value: string | undefined): string {
  return value?.trim().toLocaleLowerCase('en-US') ?? '';
}

export function isProjectDomainEntity(entity: Entity): boolean {
  return (
    entity.kind.toLocaleLowerCase('en-US') ===
      PROJECT_DOMAIN_KIND.toLocaleLowerCase('en-US') &&
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
