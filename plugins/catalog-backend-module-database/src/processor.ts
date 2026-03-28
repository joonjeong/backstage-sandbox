import type { LoggerService } from '@backstage/backend-plugin-api';
import type { Config } from '@backstage/config';
import Knex from 'knex';
import type {
  CatalogProcessor,
  CatalogProcessorCache,
  CatalogProcessorEmit,
  CatalogProcessorParser,
  LocationSpec,
} from '@backstage/plugin-catalog-node';
import { processingResult } from '@backstage/plugin-catalog-node';
import {
  CatalogEntityDocument,
  DATABASE_LOCATION_TYPE,
  type DatabaseLocationEntity,
  type InlineDatabaseTargetPayload,
  type InlineMappedSourceConfig,
  type InlineMappedSourceRecord,
} from './types';
import { toMappedCatalogEntityDocument } from './templates';

const INLINE_DATABASE_TARGET_HOST = 'inline';

export { DATABASE_LOCATION_TYPE };

type ResolvedDatabaseLocationTarget = {
  mode: 'inline-mapped';
  sourceName: string;
  loadDocuments: () => Promise<CatalogEntityDocument[]>;
};

function encodeInlineDatabaseTarget(
  payload: InlineDatabaseTargetPayload,
): string {
  const config = Buffer.from(JSON.stringify(payload), 'utf8').toString(
    'base64url',
  );
  return `database://${INLINE_DATABASE_TARGET_HOST}/${encodeURIComponent(
    payload.sourceName,
  )}?config=${encodeURIComponent(config)}`;
}

function decodeInlineDatabaseTarget(
  target: string,
): InlineDatabaseTargetPayload | undefined {
  let url: URL;

  try {
    url = new URL(target);
  } catch {
    return undefined;
  }

  if (
    url.protocol !== `${DATABASE_LOCATION_TYPE}:` ||
    url.hostname !== INLINE_DATABASE_TARGET_HOST
  ) {
    return undefined;
  }

  const encodedConfig = url.searchParams.get('config');
  if (!encodedConfig) {
    throw new Error('Inline database target is missing config query param');
  }

  return JSON.parse(
    Buffer.from(encodedConfig, 'base64url').toString('utf8'),
  ) as InlineDatabaseTargetPayload;
}

function isDatabaseLocationEntity(
  entity: import('@backstage/catalog-model').Entity,
): entity is DatabaseLocationEntity {
  return entity.kind === 'Location';
}

async function listInlineMappedSourceDocuments(
  source: InlineMappedSourceConfig,
): Promise<CatalogEntityDocument[]> {
  const db = Knex({
    client: source.backend.client,
    connection: source.backend.connection as any,
    useNullAsDefault: source.backend.client === 'better-sqlite3',
  });

  try {
    let query = db(source.backend.tableName).select('*');
    for (const clause of source.backend.where ?? []) {
      query = query.where(clause.column, clause.equals);
    }

    const rows = (await query) as Array<Record<string, any>>;

    const records: InlineMappedSourceRecord[] = rows.map(row => ({
      item: row,
      updatedAt: String(row[source.updatedAtField] ?? ''),
    }));

    return records.map(record => toMappedCatalogEntityDocument(source, record));
  } finally {
    await db.destroy();
  }
}

function resolveDatabaseLocationTarget(
  target: string,
): ResolvedDatabaseLocationTarget {
  const inlinePayload = decodeInlineDatabaseTarget(target);
  if (!inlinePayload) {
    throw new Error(
      'The generic database catalog module only supports inline Location.spec.x-database',
    );
  }

  const source = {
    name: inlinePayload.sourceName,
    backend: {
      client: inlinePayload.mapper.client,
      connection: inlinePayload.mapper.connection,
      tableName: inlinePayload.mapper.tableName,
      where: inlinePayload.mapper.where,
    },
    entity: inlinePayload.mapper.entity,
    locationKeyTemplate: inlinePayload.mapper.locationKey,
    updatedAtField: inlinePayload.mapper.updatedAtField ?? 'updated_at',
  };

  return {
    mode: 'inline-mapped',
    sourceName: source.name,
    loadDocuments: () => listInlineMappedSourceDocuments(source),
  };
}

function normalizeInlineDatabaseLocationEntity(
  entity: DatabaseLocationEntity,
): DatabaseLocationEntity {
  if (
    entity.spec.type !== DATABASE_LOCATION_TYPE ||
    !entity.spec['x-database']
  ) {
    return entity;
  }

  const targetName = entity.spec.target ?? entity.metadata.name;
  if (!targetName) {
    throw new Error(
      'database Location entity requires metadata.name or spec.target',
    );
  }

  if (entity.spec.targets?.length) {
    throw new Error(
      'database Location entity with x-database does not support spec.targets',
    );
  }

  return {
    ...entity,
    spec: {
      ...entity.spec,
      target: encodeInlineDatabaseTarget({
        sourceName: targetName,
        mapper: entity.spec['x-database'],
      }),
    },
  };
}

export class DatabaseLocationProcessor implements CatalogProcessor {
  constructor(
    _config: Config,
    private readonly logger: LoggerService,
    private readonly options?: {
      resolveTarget?: (target: string) => ResolvedDatabaseLocationTarget;
    },
  ) {}

  getProcessorName(): string {
    return 'CatalogDatabaseLocationProcessor';
  }

  async preProcessEntity(
    entity: import('@backstage/catalog-model').Entity,
    _location: LocationSpec,
  ): Promise<import('@backstage/catalog-model').Entity> {
    if (!isDatabaseLocationEntity(entity)) {
      return entity;
    }

    return normalizeInlineDatabaseLocationEntity(entity);
  }

  async readLocation(
    location: LocationSpec,
    optional: boolean,
    emit: CatalogProcessorEmit,
    _parser: CatalogProcessorParser,
    _cache: CatalogProcessorCache,
  ): Promise<boolean> {
    if (location.type !== DATABASE_LOCATION_TYPE) {
      return false;
    }

    try {
      const resolved =
        this.options?.resolveTarget?.(location.target) ??
        resolveDatabaseLocationTarget(location.target);
      const documents = await resolved.loadDocuments();

      if (documents.length === 0 && !optional) {
        emit(
          processingResult.notFoundError(
            location,
            `database location ${location.target} returned no entities`,
          ),
        );
      }

      for (const document of documents) {
        emit(
          processingResult.entity(location, document.entity, {
            locationKey: document.locationKey,
          }),
        );
      }

      emit(processingResult.refresh(`${location.type}:${location.target}`));
      this.logger.info(
        `Processed ${location.type} catalog location ${location.target} as ${resolved.mode} source '${resolved.sourceName}' with ${documents.length} entities`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      emit(processingResult.inputError(location, message));
    }

    return true;
  }
}
