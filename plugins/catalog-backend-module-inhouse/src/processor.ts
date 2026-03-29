import type { LoggerService } from '@backstage/backend-plugin-api';
import {
  getCompoundEntityRef,
  parseEntityRef,
  RELATION_HAS_PART,
  RELATION_OWNED_BY,
  RELATION_OWNER_OF,
  RELATION_PART_OF,
  stringifyEntityRef,
  type CompoundEntityRef,
} from '@backstage/catalog-model';
import { entityKindSchemaValidator, type Entity } from '@backstage/catalog-model';
import type { Config } from '@backstage/config';
import type {
  CatalogProcessor,
  CatalogProcessorCache,
  CatalogProcessorEmit,
  LocationSpec,
} from '@backstage/plugin-catalog-node';
import { processingResult } from '@backstage/plugin-catalog-node';
import {
  EDGE_STACK_KIND,
  EDGE_STACK_PROJECT_ANNOTATION,
  PROJECT_API_VERSION,
  PROJECT_COMPONENT_ANNOTATION,
  PROJECT_KIND,
  RELATION_RECEIVES_TRAFFIC_FROM,
  RELATION_ROUTES_TRAFFIC_TO,
  type EdgeStackLinkedEntity,
  type EdgeStackEntity,
  type ProjectAwareComponentEntity,
  type ProjectEntity,
} from './types';

const projectEntityValidator = entityKindSchemaValidator<ProjectEntity>({
  type: 'object',
  required: ['apiVersion', 'kind', 'metadata', 'spec'],
  properties: {
    apiVersion: {
      enum: [PROJECT_API_VERSION],
    },
    kind: {
      enum: [PROJECT_KIND],
    },
    metadata: {
      $ref: 'EntityMeta',
    },
    spec: {
      type: 'object',
      required: ['owner', 'team'],
      properties: {
        owner: {
          type: 'string',
        },
        team: {
          type: 'string',
        },
      },
      additionalProperties: false,
    },
  },
});

const edgeStackEntityValidator = entityKindSchemaValidator<EdgeStackEntity>({
  type: 'object',
  required: ['apiVersion', 'kind', 'metadata', 'spec'],
  properties: {
    apiVersion: {
      enum: [PROJECT_API_VERSION],
    },
    kind: {
      enum: [EDGE_STACK_KIND],
    },
    metadata: {
      $ref: 'EntityMeta',
    },
    spec: {
      type: 'object',
      required: ['owner', 'team', 'pattern'],
      properties: {
        owner: {
          type: 'string',
        },
        team: {
          type: 'string',
        },
        pattern: {
          type: 'string',
        },
        shared: {
          type: 'boolean',
        },
        projects: {
          type: 'array',
          items: {
            type: 'string',
          },
        },
        exposure: {
          type: 'object',
          additionalProperties: true,
        },
        network: {
          type: 'object',
          additionalProperties: true,
        },
        routing: {
          type: 'object',
          additionalProperties: true,
        },
        hops: {
          type: 'array',
          items: {
            type: 'object',
            required: ['role', 'kind', 'entityRef'],
            properties: {
              role: {
                type: 'string',
              },
              kind: {
                type: 'string',
              },
              entityRef: {
                type: 'string',
              },
            },
            additionalProperties: true,
          },
        },
        attachments: {
          type: 'array',
          items: {
            type: 'object',
            required: ['role', 'kind', 'entityRef'],
            properties: {
              role: {
                type: 'string',
              },
              kind: {
                type: 'string',
              },
              entityRef: {
                type: 'string',
              },
            },
            additionalProperties: true,
          },
        },
        targets: {
          type: 'array',
          items: {
            type: 'object',
            required: ['entityRef'],
            properties: {
              entityRef: {
                type: 'string',
              },
              trafficType: {
                type: 'string',
              },
            },
            additionalProperties: true,
          },
        },
      },
      additionalProperties: true,
    },
  },
});

function isProjectEntity(entity: Entity): entity is ProjectEntity {
  return (
    entity.apiVersion === PROJECT_API_VERSION && entity.kind === PROJECT_KIND
  );
}

function isEdgeStackEntity(entity: Entity): entity is EdgeStackEntity {
  return (
    entity.apiVersion === PROJECT_API_VERSION && entity.kind === EDGE_STACK_KIND
  );
}

function isProjectAwareComponentEntity(
  entity: Entity,
): entity is ProjectAwareComponentEntity {
  return entity.kind === 'Component';
}

function normalizeRef(
  ref: string,
  entity: Entity,
  defaultKind: string,
): string {
  return stringifyEntityRef(
    parseEntityRef(ref, {
      defaultKind,
      defaultNamespace: entity.metadata.namespace,
    }),
  );
}

function emitOwnershipRelations(
  emit: CatalogProcessorEmit,
  source: CompoundEntityRef,
  target: CompoundEntityRef,
): void {
  emit(
    processingResult.relation({
      source,
      type: RELATION_OWNED_BY,
      target,
    }),
  );
  emit(
    processingResult.relation({
      source: target,
      type: RELATION_OWNER_OF,
      target: source,
    }),
  );
}

function emitProjectMembershipRelations(
  emit: CatalogProcessorEmit,
  component: CompoundEntityRef,
  project: CompoundEntityRef,
): void {
  emit(
    processingResult.relation({
      source: component,
      type: RELATION_PART_OF,
      target: project,
    }),
  );
  emit(
    processingResult.relation({
      source: project,
      type: RELATION_HAS_PART,
      target: component,
    }),
  );
}

function emitTrafficRelations(
  emit: CatalogProcessorEmit,
  source: CompoundEntityRef,
  target: CompoundEntityRef,
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

function normalizeLinkedEntities(
  items: EdgeStackLinkedEntity[] | undefined,
  entity: Entity,
): EdgeStackLinkedEntity[] | undefined {
  return items?.map(item => ({
    ...item,
    entityRef: normalizeRef(item.entityRef, entity, 'Resource'),
  }));
}

export class ProjectProcessor implements CatalogProcessor {
  constructor(
    _config: Config,
    private readonly logger: LoggerService,
  ) {}

  getProcessorName(): string {
    return 'CatalogProjectProcessor';
  }

  async validateEntityKind(entity: Entity): Promise<boolean> {
    if (isProjectEntity(entity)) {
      return projectEntityValidator(entity) !== false;
    }

    if (isEdgeStackEntity(entity)) {
      return edgeStackEntityValidator(entity) !== false;
    }

    return false;
  }

  async preProcessEntity(
    entity: Entity,
    _location: LocationSpec,
    _emit: CatalogProcessorEmit,
    _originLocation: LocationSpec,
    _cache: CatalogProcessorCache,
  ): Promise<Entity> {
    if (isProjectEntity(entity)) {
      return {
        ...entity,
        spec: {
          ...entity.spec,
          owner: normalizeRef(entity.spec.owner, entity, 'User'),
          team: normalizeRef(entity.spec.team, entity, 'Group'),
        },
      };
    }

    if (isEdgeStackEntity(entity)) {
      const projects =
        entity.spec.projects?.length
          ? entity.spec.projects
          : entity.metadata.annotations?.[EDGE_STACK_PROJECT_ANNOTATION]
            ?.split(',')
            .map(projectRef => projectRef.trim())
            .filter(Boolean) ?? [];

      return {
        ...entity,
        spec: {
          ...entity.spec,
          owner: normalizeRef(entity.spec.owner, entity, 'User'),
          team: normalizeRef(entity.spec.team, entity, 'Group'),
          projects: projects.map(projectRef =>
            normalizeRef(projectRef, entity, PROJECT_KIND),
          ),
          network: entity.spec.network
            ? {
                ...entity.spec.network,
                vpcRef: entity.spec.network.vpcRef
                  ? normalizeRef(entity.spec.network.vpcRef, entity, 'Resource')
                  : undefined,
              }
            : entity.spec.network,
          hops: normalizeLinkedEntities(entity.spec.hops, entity),
          attachments: normalizeLinkedEntities(entity.spec.attachments, entity),
          targets: entity.spec.targets?.map(target => ({
            ...target,
            entityRef: normalizeRef(target.entityRef, entity, 'Component'),
          })),
        },
        metadata: {
          ...entity.metadata,
          annotations: {
            ...entity.metadata.annotations,
            ...(projects.length > 0
              ? {
                  [EDGE_STACK_PROJECT_ANNOTATION]: projects
                    .map(projectRef => normalizeRef(projectRef, entity, PROJECT_KIND))
                    .join(','),
                }
              : {}),
          },
        },
      };
    }

    if (!isProjectAwareComponentEntity(entity)) {
      return entity;
    }

    const projectRef = entity.metadata.annotations?.[PROJECT_COMPONENT_ANNOTATION];
    if (!projectRef) {
      return entity;
    }

    return {
      ...entity,
      metadata: {
        ...entity.metadata,
        annotations: {
          ...entity.metadata.annotations,
          [PROJECT_COMPONENT_ANNOTATION]: normalizeRef(
            projectRef,
            entity,
            PROJECT_KIND,
          ),
        },
      },
    };
  }

  async postProcessEntity(
    entity: Entity,
    _location: LocationSpec,
    emit: CatalogProcessorEmit,
    _cache: CatalogProcessorCache,
  ): Promise<Entity> {
    if (isProjectEntity(entity)) {
      const source = getCompoundEntityRef(entity);
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

      this.logger.info(
        `Processed ${PROJECT_KIND} entity ${stringifyEntityRef(entity)} with owner ${stringifyEntityRef(
          owner,
        )} and team ${stringifyEntityRef(team)}`,
      );

      return entity;
    }

    if (isEdgeStackEntity(entity)) {
      const source = getCompoundEntityRef(entity);
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

      for (const projectRef of entity.spec.projects ?? []) {
        const project = parseEntityRef(projectRef, {
          defaultKind: PROJECT_KIND,
          defaultNamespace: entity.metadata.namespace,
        });
        emitProjectMembershipRelations(emit, source, project);
      }

      for (const linkedEntity of [
        ...(entity.spec.attachments ?? []),
        ...(entity.spec.hops ?? []),
      ]) {
        const target = parseEntityRef(linkedEntity.entityRef, {
          defaultKind: 'Resource',
          defaultNamespace: entity.metadata.namespace,
        });
        emitProjectMembershipRelations(emit, target, source);
      }

      for (const targetRef of entity.spec.targets ?? []) {
        const target = parseEntityRef(targetRef.entityRef, {
          defaultKind: 'Component',
          defaultNamespace: entity.metadata.namespace,
        });
        emitTrafficRelations(emit, source, target);
      }

      this.logger.info(
        `Processed ${EDGE_STACK_KIND} entity ${stringifyEntityRef(entity)} with ${entity.spec.targets?.length ?? 0} traffic targets`,
      );

      return entity;
    }

    if (!isProjectAwareComponentEntity(entity)) {
      return entity;
    }

    const projectRef = entity.metadata.annotations?.[PROJECT_COMPONENT_ANNOTATION];
    if (!projectRef) {
      return entity;
    }

    const component = getCompoundEntityRef(entity);
    const project = parseEntityRef(projectRef, {
      defaultKind: PROJECT_KIND,
      defaultNamespace: entity.metadata.namespace,
    });

    emitProjectMembershipRelations(emit, component, project);

    this.logger.info(
      `Processed component ${stringifyEntityRef(entity)} as part of project ${stringifyEntityRef(
        project,
      )}`,
    );

    return entity;
  }
}
