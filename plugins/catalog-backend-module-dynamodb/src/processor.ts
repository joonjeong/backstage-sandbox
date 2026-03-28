import type { LoggerService } from '@backstage/backend-plugin-api';
import type { Config } from '@backstage/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
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
  DYNAMODB_LOCATION_TYPE,
  InlineDynamoDbTargetPayload,
  InlineMappedSourceConfig,
  InlineMappedSourceRecord,
  type DynamoDbLocationEntity,
} from './types';
import { toMappedCatalogEntityDocument } from './templates';

const INLINE_DYNAMODB_TARGET_HOST = 'inline';

export { DYNAMODB_LOCATION_TYPE };

type ResolvedDynamoDbLocationTarget =
  | {
      mode: 'inline-mapped';
      sourceName: string;
      loadDocuments: () => Promise<CatalogEntityDocument[]>;
    };

export function parseRawDynamoDbLocationTarget(_target: string): never {
  throw new Error(
    "The generic DynamoDB catalog module only supports inline Location.spec.x-dynamodb; raw:<source> is not supported here",
  );
}

function encodeInlineDynamoDbTarget(payload: InlineDynamoDbTargetPayload): string {
  const config = Buffer.from(JSON.stringify(payload), 'utf8').toString(
    'base64url',
  );
  return `dynamodb://${INLINE_DYNAMODB_TARGET_HOST}/${encodeURIComponent(
    payload.sourceName,
  )}?config=${encodeURIComponent(config)}`;
}

function decodeInlineDynamoDbTarget(
  target: string,
): InlineDynamoDbTargetPayload | undefined {
  let url: URL;

  try {
    url = new URL(target);
  } catch {
    return undefined;
  }

  if (
    url.protocol !== `${DYNAMODB_LOCATION_TYPE}:` ||
    url.hostname !== INLINE_DYNAMODB_TARGET_HOST
  ) {
    return undefined;
  }

  const encodedConfig = url.searchParams.get('config');
  if (!encodedConfig) {
    throw new Error('Inline dynamodb target is missing config query param');
  }

  return JSON.parse(
    Buffer.from(encodedConfig, 'base64url').toString('utf8'),
  ) as InlineDynamoDbTargetPayload;
}

function isDynamoDbLocationEntity(
  entity: import('@backstage/catalog-model').Entity,
): entity is DynamoDbLocationEntity {
  return entity.kind === 'Location';
}

async function listInlineMappedSourceDocuments(
  source: InlineMappedSourceConfig,
): Promise<CatalogEntityDocument[]> {
  const baseClient = new DynamoDBClient({
    region: source.backend.dynamoRegion,
    endpoint: source.backend.dynamoEndpoint,
  });
  const client = DynamoDBDocumentClient.from(baseClient);
  const items: InlineMappedSourceRecord[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const output = await client.send(
      new QueryCommand({
        TableName: source.backend.dynamoTableName,
        KeyConditionExpression: source.backend.dynamoSortKeyPrefix
          ? 'pk = :pk AND begins_with(sk, :skPrefix)'
          : 'pk = :pk',
        ExpressionAttributeValues: source.backend.dynamoSortKeyPrefix
          ? {
              ':pk': source.backend.dynamoPartitionKey,
              ':skPrefix': source.backend.dynamoSortKeyPrefix,
            }
          : {
              ':pk': source.backend.dynamoPartitionKey,
            },
        ExclusiveStartKey,
      }),
    );

    for (const item of output.Items ?? []) {
      items.push({
        item: item as Record<string, any>,
        updatedAt: String(item[source.updatedAtField] ?? ''),
      });
    }

    ExclusiveStartKey = output.LastEvaluatedKey;
  } while (ExclusiveStartKey);

  return items.map(record => toMappedCatalogEntityDocument(source, record));
}

function resolveDynamoDbLocationTarget(
  target: string,
): ResolvedDynamoDbLocationTarget {
  const inlinePayload = decodeInlineDynamoDbTarget(target);
  if (!inlinePayload) {
    parseRawDynamoDbLocationTarget(target);
  }

  const source = {
    name: inlinePayload.sourceName,
    backend: {
      dynamoRegion: inlinePayload.mapper.region ?? process.env.AWS_REGION,
      dynamoTableName: inlinePayload.mapper.tableName,
      dynamoEndpoint: inlinePayload.mapper.endpoint,
      dynamoPartitionKey: inlinePayload.mapper.partitionKey,
      dynamoSortKeyPrefix: inlinePayload.mapper.sortKeyPrefix,
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

function normalizeInlineDynamoDbLocationEntity(
  entity: DynamoDbLocationEntity,
): DynamoDbLocationEntity {
  if (
    entity.spec.type !== DYNAMODB_LOCATION_TYPE ||
    !entity.spec['x-dynamodb']
  ) {
    return entity;
  }

  const targetName = entity.spec.target ?? entity.metadata.name;
  if (!targetName) {
    throw new Error(
      'dynamodb Location entity requires metadata.name or spec.target',
    );
  }

  if (entity.spec.targets?.length) {
    throw new Error(
      'dynamodb Location entity with x-dynamodb does not support spec.targets',
    );
  }

  return {
    ...entity,
    spec: {
      ...entity.spec,
      target: encodeInlineDynamoDbTarget({
        sourceName: targetName,
        mapper: entity.spec['x-dynamodb'],
      }),
    },
  };
}

export class DynamoDbLocationProcessor implements CatalogProcessor {
  constructor(
    _config: Config,
    private readonly logger: LoggerService,
    private readonly options?: {
      resolveTarget?: (target: string) => ResolvedDynamoDbLocationTarget;
    },
  ) {}

  getProcessorName(): string {
    return 'CatalogDynamoDbLocationProcessor';
  }

  async preProcessEntity(
    entity: import('@backstage/catalog-model').Entity,
    _location: LocationSpec,
  ): Promise<import('@backstage/catalog-model').Entity> {
    if (!isDynamoDbLocationEntity(entity)) {
      return entity;
    }

    return normalizeInlineDynamoDbLocationEntity(entity);
  }

  async readLocation(
    location: LocationSpec,
    optional: boolean,
    emit: CatalogProcessorEmit,
    _parser: CatalogProcessorParser,
    _cache: CatalogProcessorCache,
  ): Promise<boolean> {
    if (location.type !== DYNAMODB_LOCATION_TYPE) {
      return false;
    }

    try {
      const resolved =
        this.options?.resolveTarget?.(location.target) ??
        resolveDynamoDbLocationTarget(location.target);
      const documents = await resolved.loadDocuments();

      if (documents.length === 0 && !optional) {
        emit(
          processingResult.notFoundError(
            location,
            `dynamodb location ${location.target} returned no entities`,
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
