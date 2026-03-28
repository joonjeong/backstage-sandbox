import { randomUUID } from 'crypto';
import { Config } from '@backstage/config';
import Database from 'better-sqlite3';
import {
  DynamoDBClient,
  ScanCommand,
  type ScanCommandInput,
} from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import type {
  AppendProjectMetadataInput,
  ProjectMetadataRecord,
  ProjectMetadataRepository,
} from './types';

type BackendKind = 'sqlite' | 'dynamodb';

type ProjectMetadataBackendConfig = {
  type: BackendKind;
  sqliteFilename: string;
  dynamoRegion?: string;
  dynamoTableName?: string;
  dynamoEndpoint?: string;
};

type ProjectMetadataConfig = {
  writer: ProjectMetadataBackendConfig;
  catalogSource: {
    enabled: boolean;
    pollIntervalSeconds: number;
    backend: ProjectMetadataBackendConfig;
  };
};

const LATEST_SORT_KEY = 'LATEST';

function readBackendConfig(
  section: Config | undefined,
  defaults: { type: BackendKind; sqliteFilename: string },
): ProjectMetadataBackendConfig {
  return {
    type:
      (section?.getOptionalString('type') as BackendKind | undefined) ??
      defaults.type,
    sqliteFilename:
      section?.getOptionalConfig('sqlite')?.getOptionalString('filename') ??
      defaults.sqliteFilename,
    dynamoRegion:
      section?.getOptionalConfig('dynamodb')?.getOptionalString('region') ??
      process.env.AWS_REGION,
    dynamoTableName: section
      ?.getOptionalConfig('dynamodb')
      ?.getOptionalString('tableName'),
    dynamoEndpoint: section
      ?.getOptionalConfig('dynamodb')
      ?.getOptionalString('endpoint'),
  };
}

function readConfig(config: Config): ProjectMetadataConfig {
  const section = config.getOptionalConfig('inhouse-cmdb');
  const legacyBackend =
    (section?.getOptionalString('backend') as BackendKind | undefined) ??
    'sqlite';
  const legacySqliteFilename =
    section?.getOptionalConfig('sqlite')?.getOptionalString('filename') ??
    '/tmp/backstage-inhouse-cmdb.db';
  const legacyPollIntervalSeconds =
    section?.getOptionalNumber('pollIntervalSeconds') ?? 30;
  const writerSection = section?.getOptionalConfig('writer');
  const sourceSection = section?.getOptionalConfig('catalogSource');
  const sourceBackendSection = sourceSection?.getOptionalConfig('backend');

  return {
    writer: readBackendConfig(writerSection, {
      type: legacyBackend,
      sqliteFilename: legacySqliteFilename,
    }),
    catalogSource: {
      enabled: sourceSection?.getOptionalBoolean('enabled') ?? true,
      pollIntervalSeconds:
        sourceSection?.getOptionalNumber('pollIntervalSeconds') ??
        legacyPollIntervalSeconds,
      backend: readBackendConfig(sourceBackendSection, {
        type: legacyBackend,
        sqliteFilename: legacySqliteFilename,
      }),
    },
  };
}

function makeRecord(input: AppendProjectMetadataInput): ProjectMetadataRecord {
  const createdAtEpochMs = Date.now();
  return {
    eventId: randomUUID(),
    projectCode: input.projectCode,
    projectName: input.projectName,
    projectDescription: input.projectDescription,
    createdAt: new Date(createdAtEpochMs).toISOString(),
    createdAtEpochMs,
  };
}

function mapRowToRecord(row: any): ProjectMetadataRecord {
  return {
    eventId: String(row.event_id),
    projectCode: String(row.project_code),
    projectName: String(row.project_name),
    projectDescription: String(row.project_description),
    createdAt: String(row.created_at),
    createdAtEpochMs: Number(row.created_at_epoch_ms),
  };
}

class SqliteProjectMetadataRepository implements ProjectMetadataRepository {
  private readonly db: Database;

  constructor(filename: string) {
    this.db = new Database(filename);
    this.db.pragma('journal_mode = WAL');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS project_metadata_events (
        event_id TEXT PRIMARY KEY,
        project_code TEXT NOT NULL,
        project_name TEXT NOT NULL,
        project_description TEXT NOT NULL,
        created_at TEXT NOT NULL,
        created_at_epoch_ms INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_project_metadata_events_code_created
      ON project_metadata_events (project_code, created_at_epoch_ms DESC, event_id DESC);

      CREATE TABLE IF NOT EXISTS project_metadata_latest (
        project_code TEXT PRIMARY KEY,
        event_id TEXT NOT NULL,
        project_name TEXT NOT NULL,
        project_description TEXT NOT NULL,
        created_at TEXT NOT NULL,
        created_at_epoch_ms INTEGER NOT NULL
      );
    `);
  }

  async append(
    input: AppendProjectMetadataInput,
  ): Promise<ProjectMetadataRecord> {
    const record = makeRecord(input);
    const tx = this.db.transaction(() => {
      this.db
        .prepare(
          `
            INSERT INTO project_metadata_events (
              event_id,
              project_code,
              project_name,
              project_description,
              created_at,
              created_at_epoch_ms
            ) VALUES (?, ?, ?, ?, ?, ?)
          `,
        )
        .run(
          record.eventId,
          record.projectCode,
          record.projectName,
          record.projectDescription,
          record.createdAt,
          record.createdAtEpochMs,
        );

      this.db
        .prepare(
          `
            INSERT INTO project_metadata_latest (
              project_code,
              event_id,
              project_name,
              project_description,
              created_at,
              created_at_epoch_ms
            ) VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(project_code) DO UPDATE SET
              event_id = excluded.event_id,
              project_name = excluded.project_name,
              project_description = excluded.project_description,
              created_at = excluded.created_at,
              created_at_epoch_ms = excluded.created_at_epoch_ms
          `,
        )
        .run(
          record.projectCode,
          record.eventId,
          record.projectName,
          record.projectDescription,
          record.createdAt,
          record.createdAtEpochMs,
        );
    });

    tx();
    return record;
  }

  async getLatest(
    projectCode: string,
  ): Promise<ProjectMetadataRecord | undefined> {
    const row = this.db
      .prepare(
        `
          SELECT
            event_id,
            project_code,
            project_name,
            project_description,
            created_at,
            created_at_epoch_ms
          FROM project_metadata_latest
          WHERE project_code = ?
        `,
      )
      .get(projectCode);

    return row ? mapRowToRecord(row) : undefined;
  }

  async listLatest(): Promise<ProjectMetadataRecord[]> {
    const rows = this.db
      .prepare(
        `
          SELECT
            event_id,
            project_code,
            project_name,
            project_description,
            created_at,
            created_at_epoch_ms
          FROM project_metadata_latest
          ORDER BY project_code ASC
        `,
      )
      .all();

    return rows.map(mapRowToRecord);
  }

  async listHistory(projectCode: string): Promise<ProjectMetadataRecord[]> {
    const rows = this.db
      .prepare(
        `
          SELECT
            event_id,
            project_code,
            project_name,
            project_description,
            created_at,
            created_at_epoch_ms
          FROM project_metadata_events
          WHERE project_code = ?
          ORDER BY created_at_epoch_ms DESC, event_id DESC
        `,
      )
      .all(projectCode);

    return rows.map(mapRowToRecord);
  }
}

function marshalRecord(record: ProjectMetadataRecord) {
  return {
    event_id: record.eventId,
    project_code: record.projectCode,
    project_name: record.projectName,
    project_description: record.projectDescription,
    created_at: record.createdAt,
    created_at_epoch_ms: record.createdAtEpochMs,
  };
}

function mapItemToRecord(item: any): ProjectMetadataRecord {
  return {
    eventId: String(item.event_id),
    projectCode: String(item.project_code),
    projectName: String(item.project_name),
    projectDescription: String(item.project_description),
    createdAt: String(item.created_at),
    createdAtEpochMs: Number(item.created_at_epoch_ms),
  };
}

class DynamoDbProjectMetadataRepository implements ProjectMetadataRepository {
  private readonly client: DynamoDBDocumentClient;
  private readonly tableName: string;

  constructor(options: {
    region: string;
    tableName: string;
    endpoint?: string;
  }) {
    const baseClient = new DynamoDBClient({
      region: options.region,
      endpoint: options.endpoint,
    });
    this.client = DynamoDBDocumentClient.from(baseClient);
    this.tableName = options.tableName;
  }

  async append(
    input: AppendProjectMetadataInput,
  ): Promise<ProjectMetadataRecord> {
    const record = makeRecord(input);
    const pk = `PROJECT#${record.projectCode}`;
    const eventSortKey = `EVENT#${String(record.createdAtEpochMs).padStart(
      13,
      '0',
    )}#${record.eventId}`;
    const baseRecord = marshalRecord(record);

    await this.client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          pk,
          sk: eventSortKey,
          item_type: 'event',
          ...baseRecord,
        },
      }),
    );

    await this.client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          pk,
          sk: LATEST_SORT_KEY,
          item_type: 'latest',
          latest_event_sort_key: eventSortKey,
          ...baseRecord,
        },
      }),
    );

    return record;
  }

  async getLatest(
    projectCode: string,
  ): Promise<ProjectMetadataRecord | undefined> {
    const output = await this.client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: {
          pk: `PROJECT#${projectCode}`,
          sk: LATEST_SORT_KEY,
        },
      }),
    );

    return output.Item ? mapItemToRecord(output.Item) : undefined;
  }

  async listLatest(): Promise<ProjectMetadataRecord[]> {
    const records: ProjectMetadataRecord[] = [];
    let ExclusiveStartKey: Record<string, any> | undefined;

    do {
      const input: ScanCommandInput = {
        TableName: this.tableName,
        FilterExpression: 'sk = :latest',
        ExpressionAttributeValues: {
          ':latest': { S: LATEST_SORT_KEY },
        },
        ExclusiveStartKey,
      };

      const output = await this.client.send(new ScanCommand(input));
      for (const item of output.Items ?? []) {
        const normalized = Object.fromEntries(
          Object.entries(item).map(([key, value]) => {
            if (value && typeof value === 'object' && 'S' in value) {
              return [key, value.S];
            }
            if (value && typeof value === 'object' && 'N' in value) {
              return [key, Number(value.N)];
            }
            return [key, undefined];
          }),
        );
        records.push(mapItemToRecord(normalized));
      }

      ExclusiveStartKey = output.LastEvaluatedKey;
    } while (ExclusiveStartKey);

    return records.sort((a, b) => a.projectCode.localeCompare(b.projectCode));
  }

  async listHistory(projectCode: string): Promise<ProjectMetadataRecord[]> {
    const output = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :eventPrefix)',
        ExpressionAttributeValues: {
          ':pk': `PROJECT#${projectCode}`,
          ':eventPrefix': 'EVENT#',
        },
        ScanIndexForward: false,
      }),
    );

    return (output.Items ?? []).map(mapItemToRecord);
  }
}

function createRepositoryFromBackend(
  settings: ProjectMetadataBackendConfig,
): ProjectMetadataRepository {
  if (settings.type === 'sqlite') {
    return new SqliteProjectMetadataRepository(settings.sqliteFilename);
  }

  if (!settings.dynamoRegion || !settings.dynamoTableName) {
    throw new Error(
      'inhouse-cmdb.*.backend.dynamodb.region and tableName are required when type is dynamodb',
    );
  }

  return new DynamoDbProjectMetadataRepository({
    region: settings.dynamoRegion,
    tableName: settings.dynamoTableName,
    endpoint: settings.dynamoEndpoint,
  });
}

const repositorySingletons = new Map<string, ProjectMetadataRepository>();

function getRepositorySingleton(
  key: string,
  settings: ProjectMetadataBackendConfig,
): ProjectMetadataRepository {
  const existing = repositorySingletons.get(key);
  if (existing) {
    return existing;
  }

  const created = createRepositoryFromBackend(settings);
  repositorySingletons.set(key, created);
  return created;
}

export function createProjectMetadataWriterRepository(
  config: Config,
): ProjectMetadataRepository {
  return getRepositorySingleton('writer', readConfig(config).writer);
}

export function createProjectMetadataCatalogSourceRepository(
  config: Config,
): ProjectMetadataRepository {
  return getRepositorySingleton(
    'catalogSource',
    readConfig(config).catalogSource.backend,
  );
}

export function getProjectMetadataCatalogSourceOptions(config: Config): {
  enabled: boolean;
  pollIntervalMs: number;
} {
  const source = readConfig(config).catalogSource;
  return {
    enabled: source.enabled,
    pollIntervalMs: source.pollIntervalSeconds * 1000,
  };
}

export function createSqliteProjectMetadataRepositoryForTests(
  filename: string,
) {
  return new SqliteProjectMetadataRepository(filename);
}
