import {
  domainEntityV1alpha1Validator,
  parseEntityRef,
  stringifyEntityRef,
  type Entity,
} from '@backstage/catalog-model';
import type { CatalogProcessorEmit } from '@backstage/plugin-catalog-node';
import type { LoggerService } from '@backstage/backend-plugin-api';
import {
  emitOwnershipRelations,
  emitPartOfRelations,
} from '../../../utils/relation-utils';
import {
  getEntityRef,
  normalizeProjectDomainRef,
  normalizeRef,
} from '../../../utils/entity-ref-utils';
import {
  isProjectAwareComponentEntity,
  isProjectDomainEntity,
  PROJECT_COMPONENT_ANNOTATION,
  PROJECT_DOMAIN_ROLE,
  PROJECT_DOMAIN_ROLE_ANNOTATION,
  type ProjectDomainEntity,
} from './types';

export async function validateProjectDomainEntity(
  entity: Entity,
): Promise<boolean> {
  if (
    !(
      entity.kind === 'Domain' &&
      entity.metadata.annotations?.[
        PROJECT_DOMAIN_ROLE_ANNOTATION
      ]?.trim().toLocaleLowerCase('en-US') === PROJECT_DOMAIN_ROLE
    )
  ) {
    return false;
  }

  await domainEntityV1alpha1Validator.check(entity);

  if (!isProjectDomainEntity(entity)) {
    throw new TypeError('Project domain entity requires spec.team');
  }

  return true;
}

export function preProcessProjectDomainEntity(
  entity: ProjectDomainEntity,
): Entity {
  return {
    ...entity,
    spec: {
      ...entity.spec,
      owner: normalizeRef(entity.spec.owner, entity, 'User'),
      team: normalizeRef(entity.spec.team, entity, 'Group'),
    },
  };
}

export function preProcessProjectAwareComponentEntity(entity: Entity): Entity {
  if (!isProjectAwareComponentEntity(entity)) {
    return entity;
  }

  const projectRef =
    entity.metadata.annotations?.[PROJECT_COMPONENT_ANNOTATION];
  if (!projectRef) {
    return entity;
  }

  return {
    ...entity,
    metadata: {
      ...entity.metadata,
      annotations: {
        ...entity.metadata.annotations,
        [PROJECT_COMPONENT_ANNOTATION]: normalizeProjectDomainRef(
          projectRef,
          entity,
        ),
      },
    },
  };
}

export function postProcessProjectDomainEntity(
  entity: ProjectDomainEntity,
  emit: CatalogProcessorEmit,
  logger: LoggerService,
): Entity {
  const source = getEntityRef(entity);
  const owner = parseEntityRef(entity.spec.owner, {
    defaultKind: 'User',
    defaultNamespace: entity.metadata.namespace,
  });
  const team = parseEntityRef(entity.spec.team, {
    defaultKind: 'Group',
    defaultNamespace: entity.metadata.namespace,
  });

  emitOwnershipRelations(emit, source, owner);
  emitOwnershipRelations(emit, source, team);

  logger.info(
    `Processed project domain ${stringifyEntityRef(
      entity,
    )} with owner ${stringifyEntityRef(owner)} and team ${stringifyEntityRef(
      team,
    )}`,
  );

  return entity;
}

export function postProcessProjectAwareComponentEntity(
  entity: Entity,
  emit: CatalogProcessorEmit,
  logger: LoggerService,
): Entity {
  if (!isProjectAwareComponentEntity(entity)) {
    return entity;
  }

  const projectRef =
    entity.metadata.annotations?.[PROJECT_COMPONENT_ANNOTATION];
  if (!projectRef) {
    return entity;
  }

  const component = getEntityRef(entity);
  const project = parseEntityRef(projectRef, {
    defaultKind: 'Domain',
    defaultNamespace: entity.metadata.namespace,
  });

  emitPartOfRelations(emit, component, project);

  logger.info(
    `Processed component ${stringifyEntityRef(
      entity,
    )} as part of project ${stringifyEntityRef(project)}`,
  );

  return entity;
}
