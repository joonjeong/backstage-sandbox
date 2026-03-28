import { Entity, stringifyEntityRef } from '@backstage/catalog-model';
import type { LoggerService } from '@backstage/backend-plugin-api';
import type {
  DeferredEntity,
  EntityProvider,
  EntityProviderConnection,
} from '@backstage/plugin-catalog-node';
import type { ProjectMetadataRepository } from './types';

export function sanitizeProjectMetadataEntityName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63);
}

export function toProjectMetadataEntityRef(projectCode: string): string {
  return stringifyEntityRef({
    kind: 'Component',
    namespace: 'default',
    name: sanitizeProjectMetadataEntityName(projectCode) || 'unknown-project',
  });
}

export function toProjectMetadataEntity(record: {
  projectCode: string;
  projectName: string;
  projectDescription: string;
  eventId: string;
  createdAt: string;
}): Entity {
  const entityRef = toProjectMetadataEntityRef(record.projectCode);
  const name = entityRef.split('/').at(-1) ?? 'unknown-project';
  const managedByLocation = `url:https://inhouse-cmdb/${record.projectCode}`;

  return {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: {
      name,
      title: record.projectName,
      description: record.projectDescription,
      annotations: {
        'metadata.backstage.io/project-code': record.projectCode,
        'metadata.backstage.io/event-id': record.eventId,
        'metadata.backstage.io/updated-at': record.createdAt,
        'backstage.io/managed-by-location': managedByLocation,
        'backstage.io/managed-by-origin-location': managedByLocation,
      },
    },
    spec: {
      type: 'inhouse-cmdb',
      lifecycle: 'unknown',
      owner: 'user:default/guest',
    },
  };
}

export class ProjectMetadataEntityProvider implements EntityProvider {
  private connection?: EntityProviderConnection;
  private intervalRef?: NodeJS.Timeout;

  constructor(
    private readonly repository: ProjectMetadataRepository,
    private readonly logger: LoggerService,
    private readonly intervalMs: number,
  ) {}

  getProviderName(): string {
    return 'inhouse-cmdb-provider';
  }

  async connect(connection: EntityProviderConnection): Promise<void> {
    this.connection = connection;
    await this.run();

    if (!this.intervalRef) {
      this.intervalRef = setInterval(() => {
        void this.run();
      }, this.intervalMs);
      this.intervalRef.unref?.();
    }
  }

  private async run(): Promise<void> {
    if (!this.connection) {
      return;
    }

    const latestRecords = await this.repository.listLatest();
    const entities: DeferredEntity[] = latestRecords.map(record => {
      const entityRef = toProjectMetadataEntityRef(record.projectCode);

      return {
        entity: toProjectMetadataEntity(record),
        locationKey: `inhouse-cmdb:${entityRef}`,
      };
    });

    await this.connection.applyMutation({
      type: 'full',
      entities,
    });

    this.logger.info(
      `inhouse-cmdb-provider synced ${entities.length} latest project entities`,
    );
    this.logger.info(
      `inhouse-cmdb-provider entity refs: ${entities
        .map(entity => stringifyEntityRef(entity.entity))
        .join(', ')}`,
    );
  }
}
