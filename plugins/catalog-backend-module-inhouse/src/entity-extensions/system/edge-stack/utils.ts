import {
  parseEntityRef,
  stringifyEntityRef,
  systemEntityV1alpha1Validator,
  type Entity,
} from '@backstage/catalog-model';
import type { CatalogProcessorEmit } from '@backstage/plugin-catalog-node';
import type { LoggerService } from '@backstage/backend-plugin-api';
import {
  getEntityRef,
  normalizeLinkedEntities,
  normalizeProjectDomainRef,
  normalizeRef,
} from '../../../utils/entity-ref-utils';
import {
  emitOwnershipRelations,
  emitPartOfRelations,
} from '../../../utils/relation-utils';
import {
  EDGE_STACK_EXTENSION_KEY,
  EDGE_STACK_PROJECT_ANNOTATION,
  RELATION_RECEIVES_TRAFFIC_FROM,
  RELATION_ROUTES_TRAFFIC_TO,
  EDGE_STACK_SYSTEM_ROLE,
  EDGE_STACK_SYSTEM_ROLE_ANNOTATION,
  isEdgeStackSystemEntity,
  type EdgeStackExtension,
  type EdgeStackSystemEntity,
} from './types';
import { processingResult } from '@backstage/plugin-catalog-node';

function emitTrafficRelations(
  emit: CatalogProcessorEmit,
  source: ReturnType<typeof getEntityRef>,
  target: ReturnType<typeof getEntityRef>,
): void {
  emit(
    processingResult.relation({
      source,
      type: RELATION_ROUTES_TRAFFIC_TO,
      target,
    }),
  );
  emit(
    processingResult.relation({
      source: target,
      type: RELATION_RECEIVES_TRAFFIC_FROM,
      target: source,
    }),
  );
}

function getEdgeStackExtension(
  entity: EdgeStackSystemEntity,
): EdgeStackExtension {
  return entity.spec[EDGE_STACK_EXTENSION_KEY] as EdgeStackExtension;
}

export async function validateEdgeStackSystemEntity(
  entity: Entity,
): Promise<boolean> {
  if (
    !(
      entity.kind === 'System' &&
      entity.metadata.annotations?.[
        EDGE_STACK_SYSTEM_ROLE_ANNOTATION
      ]?.trim().toLocaleLowerCase('en-US') === EDGE_STACK_SYSTEM_ROLE
    )
  ) {
    return false;
  }

  await systemEntityV1alpha1Validator.check(entity);

  if (!isEdgeStackSystemEntity(entity)) {
    throw new TypeError(
      'Edge-stack system entity requires spec.x-edgestack.team and spec.x-edgestack.pattern',
    );
  }

  return true;
}

function normalizeEdgeStackExtension(
  edgeStack: EdgeStackExtension,
  entity: Entity,
): EdgeStackExtension {
  const projects = edgeStack.projects?.length
    ? edgeStack.projects
    : entity.metadata.annotations?.[EDGE_STACK_PROJECT_ANNOTATION]?.split(',')
        .map(projectRef => projectRef.trim())
        .filter(Boolean) ?? [];

  return {
    ...edgeStack,
    team: normalizeRef(edgeStack.team, entity, 'Group'),
    projects: projects.map(projectRef =>
      normalizeProjectDomainRef(projectRef, entity),
    ),
    network: edgeStack.network
      ? {
          ...edgeStack.network,
          vpcRef: edgeStack.network.vpcRef
            ? normalizeRef(edgeStack.network.vpcRef, entity, 'Resource')
            : undefined,
        }
      : edgeStack.network,
    hops: normalizeLinkedEntities(edgeStack.hops, entity),
    attachments: normalizeLinkedEntities(edgeStack.attachments, entity),
    targets: edgeStack.targets?.map(target => ({
      ...target,
      entityRef: normalizeRef(target.entityRef, entity, 'Component'),
    })),
  };
}

export function preProcessEdgeStackSystemEntity(
  entity: EdgeStackSystemEntity,
): Entity {
  const normalizedEdgeStack = normalizeEdgeStackExtension(
    getEdgeStackExtension(entity),
    entity,
  );
  const projects = normalizedEdgeStack.projects ?? [];

  return {
    ...entity,
    spec: {
      ...entity.spec,
      owner: normalizeRef(entity.spec.owner, entity, 'Group'),
      [EDGE_STACK_EXTENSION_KEY]: normalizedEdgeStack,
    } as Entity['spec'],
    metadata: {
      ...entity.metadata,
      annotations: {
        ...entity.metadata.annotations,
        ...(projects.length > 0
          ? {
              [EDGE_STACK_PROJECT_ANNOTATION]: projects.join(','),
            }
          : {}),
      },
    },
  };
}

export function postProcessEdgeStackSystemEntity(
  entity: EdgeStackSystemEntity,
  emit: CatalogProcessorEmit,
  logger: LoggerService,
): Entity {
  const source = getEntityRef(entity);
  const edgeStack = getEdgeStackExtension(entity);
  const owner = parseEntityRef(entity.spec.owner, {
    defaultKind: 'Group',
    defaultNamespace: entity.metadata.namespace,
  });
  const team = parseEntityRef(edgeStack.team, {
    defaultKind: 'Group',
    defaultNamespace: entity.metadata.namespace,
  });

  emitOwnershipRelations(emit, source, owner);
  emitOwnershipRelations(emit, source, team);

  for (const projectRef of edgeStack.projects ?? []) {
    const project = parseEntityRef(projectRef, {
      defaultKind: 'Domain',
      defaultNamespace: entity.metadata.namespace,
    });
    emitPartOfRelations(emit, source, project);
  }

  for (const linkedEntity of [
    ...(edgeStack.attachments ?? []),
    ...(edgeStack.hops ?? []),
  ]) {
    const target = parseEntityRef(linkedEntity.entityRef, {
      defaultKind: 'Resource',
      defaultNamespace: entity.metadata.namespace,
    });
    emitPartOfRelations(emit, target, source);
  }

  for (const targetRef of edgeStack.targets ?? []) {
    const target = parseEntityRef(targetRef.entityRef, {
      defaultKind: 'Component',
      defaultNamespace: entity.metadata.namespace,
    });
    emitTrafficRelations(emit, source, target);
  }

  logger.info(
    `Processed edge-stack system ${stringifyEntityRef(entity)} with ${
      edgeStack.targets?.length ?? 0
    } traffic targets`,
  );

  return entity;
}
