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
  PROJECT_API_VERSION,
  PROJECT_COMPONENT_ANNOTATION,
  PROJECT_KIND,
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

function isProjectEntity(entity: Entity): entity is ProjectEntity {
  return (
    entity.apiVersion === PROJECT_API_VERSION && entity.kind === PROJECT_KIND
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

export class ProjectProcessor implements CatalogProcessor {
  constructor(
    _config: Config,
    private readonly logger: LoggerService,
  ) {}

  getProcessorName(): string {
    return 'CatalogProjectProcessor';
  }

  async validateEntityKind(entity: Entity): Promise<boolean> {
    return projectEntityValidator(entity) !== false;
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
