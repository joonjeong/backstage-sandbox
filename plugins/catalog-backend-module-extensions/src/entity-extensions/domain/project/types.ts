import {
  PROJECT_DOMAIN_ROLE,
  PROJECT_DOMAIN_ROLE_ANNOTATION,
} from '@internal/plugin-catalog-extensions-common';
import {
  type DomainEntity,
  type Entity,
  isDomainEntity,
} from '@backstage/catalog-model';

export {
  PROJECT_COMPONENT_ANNOTATION,
  PROJECT_DOMAIN_ROLE,
  PROJECT_DOMAIN_ROLE_ANNOTATION,
  PROJECT_MEMBER_ANNOTATION,
} from '@internal/plugin-catalog-extensions-common';

export type ProjectDomainEntity = DomainEntity & {
  metadata: Entity['metadata'] & {
    annotations?: Record<string, string>;
  };
  spec: DomainEntity['spec'] & {
    team: string;
  };
};

export type ProjectAwareComponentEntity = Entity & {
  kind: 'Component';
  metadata: Entity['metadata'] & {
    annotations?: Record<string, string>;
  };
};

function normalizeProjectDomainRole(value: string | undefined): string {
  return value?.trim().toLocaleLowerCase('en-US') ?? '';
}

function hasProjectDomainTeam(entity: Entity): entity is ProjectDomainEntity {
  return (
    typeof entity.spec?.team === 'string' && entity.spec.team.trim() !== ''
  );
}

export function isProjectDomainEntity(
  entity: Entity,
): entity is ProjectDomainEntity {
  return (
    isDomainEntity(entity) &&
    normalizeProjectDomainRole(
      entity.metadata.annotations?.[PROJECT_DOMAIN_ROLE_ANNOTATION],
    ) === PROJECT_DOMAIN_ROLE &&
    hasProjectDomainTeam(entity)
  );
}

export function isProjectAwareComponentEntity(
  entity: Entity,
): entity is ProjectAwareComponentEntity {
  return entity.kind === 'Component';
}
