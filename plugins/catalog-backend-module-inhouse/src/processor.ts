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
import {
  entityKindSchemaValidator,
  type Entity,
} from '@backstage/catalog-model';
import type { Config } from '@backstage/config';
import type {
  CatalogProcessor,
  CatalogProcessorCache,
  CatalogProcessorEmit,
  LocationSpec,
} from '@backstage/plugin-catalog-node';
import { processingResult } from '@backstage/plugin-catalog-node';
import {
  EDGE_STACK_EXTENSION_KEY,
  EDGE_STACK_PROJECT_ANNOTATION,
  EDGE_STACK_SYSTEM_API_VERSION,
  EDGE_STACK_SYSTEM_KIND,
  EDGE_STACK_SYSTEM_ROLE,
  EDGE_STACK_SYSTEM_ROLE_ANNOTATION,
  PROJECT_DOMAIN_API_VERSION,
  PROJECT_DOMAIN_KIND,
  PROJECT_DOMAIN_ROLE,
  PROJECT_DOMAIN_ROLE_ANNOTATION,
  PROJECT_COMPONENT_ANNOTATION,
  RELATION_RECEIVES_TRAFFIC_FROM,
  RELATION_ROUTES_TRAFFIC_TO,
  type EdgeStackExtension,
  type EdgeStackLinkedEntity,
  type EdgeStackSystemEntity,
  type ProjectAwareComponentEntity,
  type ProjectDomainEntity,
  isEdgeStackSystemEntity,
  isProjectDomainEntity,
} from './types';

const projectDomainEntityValidator =
  entityKindSchemaValidator<ProjectDomainEntity>({
    type: 'object',
    required: ['apiVersion', 'kind', 'metadata', 'spec'],
    properties: {
      apiVersion: {
        enum: [PROJECT_DOMAIN_API_VERSION],
      },
      kind: {
        enum: [PROJECT_DOMAIN_KIND],
      },
      metadata: {
        allOf: [
          {
            $ref: 'EntityMeta',
          },
          {
            type: 'object',
            required: ['annotations'],
            properties: {
              annotations: {
                type: 'object',
                required: [PROJECT_DOMAIN_ROLE_ANNOTATION],
                properties: {
                  [PROJECT_DOMAIN_ROLE_ANNOTATION]: {
                    enum: [PROJECT_DOMAIN_ROLE],
                  },
                },
                additionalProperties: true,
              },
            },
          },
        ],
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
        additionalProperties: true,
      },
    },
  });

const edgeStackEntityValidator =
  entityKindSchemaValidator<EdgeStackSystemEntity>({
    type: 'object',
    required: ['apiVersion', 'kind', 'metadata', 'spec'],
    properties: {
      apiVersion: {
        enum: [EDGE_STACK_SYSTEM_API_VERSION],
      },
      kind: {
        enum: [EDGE_STACK_SYSTEM_KIND],
      },
      metadata: {
        allOf: [
          {
            $ref: 'EntityMeta',
          },
          {
            type: 'object',
            required: ['annotations'],
            properties: {
              annotations: {
                type: 'object',
                required: [EDGE_STACK_SYSTEM_ROLE_ANNOTATION],
                properties: {
                  [EDGE_STACK_SYSTEM_ROLE_ANNOTATION]: {
                    enum: [EDGE_STACK_SYSTEM_ROLE],
                  },
                },
                additionalProperties: true,
              },
            },
          },
        ],
      },
      spec: {
        type: 'object',
        required: ['owner', EDGE_STACK_EXTENSION_KEY],
        properties: {
          owner: {
            type: 'string',
          },
          type: {
            type: 'string',
          },
          lifecycle: {
            type: 'string',
          },
          domain: {
            type: 'string',
          },
          [EDGE_STACK_EXTENSION_KEY]: {
            type: 'object',
            required: ['team', 'pattern'],
            properties: {
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
              providers: {
                type: 'object',
                additionalProperties: true,
              },
            },
            additionalProperties: true,
          },
        },
        additionalProperties: true,
      },
    },
  });

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

function normalizeProjectDomainRef(ref: string, entity: Entity): string {
  const parsedRef = parseEntityRef(ref, {
    defaultKind: PROJECT_DOMAIN_KIND,
    defaultNamespace: entity.metadata.namespace,
  });

  return stringifyEntityRef({
    ...parsedRef,
    kind:
      parsedRef.kind.toLocaleLowerCase('en-US') === 'project'
        ? PROJECT_DOMAIN_KIND
        : parsedRef.kind,
  });
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

export class ProjectDomainProcessor implements CatalogProcessor {
  constructor(_config: Config, private readonly logger: LoggerService) {}

  getProcessorName(): string {
    return 'CatalogProjectDomainProcessor';
  }

  async validateEntityKind(entity: Entity): Promise<boolean> {
    if (isProjectDomainEntity(entity)) {
      return projectDomainEntityValidator(entity) !== false;
    }

    if (isEdgeStackSystemEntity(entity)) {
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
    if (isProjectDomainEntity(entity)) {
      return {
        ...entity,
        spec: {
          ...entity.spec,
          owner: normalizeRef(entity.spec.owner, entity, 'User'),
          team: normalizeRef(entity.spec.team, entity, 'Group'),
        },
      };
    }

    if (isEdgeStackSystemEntity(entity)) {
      const normalizedEdgeStack = normalizeEdgeStackExtension(
        entity.spec[EDGE_STACK_EXTENSION_KEY],
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

  async postProcessEntity(
    entity: Entity,
    _location: LocationSpec,
    emit: CatalogProcessorEmit,
    _cache: CatalogProcessorCache,
  ): Promise<Entity> {
    if (isProjectDomainEntity(entity)) {
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
        `Processed project domain ${stringifyEntityRef(
          entity,
        )} with owner ${stringifyEntityRef(
          owner,
        )} and team ${stringifyEntityRef(team)}`,
      );

      return entity;
    }

    if (isEdgeStackSystemEntity(entity)) {
      const source = getCompoundEntityRef(entity);
      const edgeStack = entity.spec[EDGE_STACK_EXTENSION_KEY];
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
          defaultKind: PROJECT_DOMAIN_KIND,
          defaultNamespace: entity.metadata.namespace,
        });
        emitProjectMembershipRelations(emit, source, project);
      }

      for (const linkedEntity of [
        ...(edgeStack.attachments ?? []),
        ...(edgeStack.hops ?? []),
      ]) {
        const target = parseEntityRef(linkedEntity.entityRef, {
          defaultKind: 'Resource',
          defaultNamespace: entity.metadata.namespace,
        });
        emitProjectMembershipRelations(emit, target, source);
      }

      for (const targetRef of edgeStack.targets ?? []) {
        const target = parseEntityRef(targetRef.entityRef, {
          defaultKind: 'Component',
          defaultNamespace: entity.metadata.namespace,
        });
        emitTrafficRelations(emit, source, target);
      }

      this.logger.info(
        `Processed edge stack ${stringifyEntityRef(entity)} with ${
          edgeStack.targets?.length ?? 0
        } traffic targets`,
      );

      return entity;
    }

    if (!isProjectAwareComponentEntity(entity)) {
      return entity;
    }

    const projectRef =
      entity.metadata.annotations?.[PROJECT_COMPONENT_ANNOTATION];
    if (!projectRef) {
      return entity;
    }

    const component = getCompoundEntityRef(entity);
    const project = parseEntityRef(projectRef, {
      defaultKind: PROJECT_DOMAIN_KIND,
      defaultNamespace: entity.metadata.namespace,
    });

    emitProjectMembershipRelations(emit, component, project);

    this.logger.info(
      `Processed component ${stringifyEntityRef(
        entity,
      )} as part of project ${stringifyEntityRef(project)}`,
    );

    return entity;
  }
}
