import { Entity } from '@backstage/catalog-model';
import { JsonValue } from '@backstage/config';

export const DATABASE_LOCATION_TYPE = 'database';

export type CatalogEntityDocument = {
  sourceName: string;
  entityRef: string;
  locationKey: string;
  entity: Entity;
  updatedAt: string;
};

export type TemplateContext = {
  item: Record<string, any>;
  sourceName: string;
};

export type InlineDatabaseMapperSpec = {
  client: 'better-sqlite3' | 'pg';
  connection: JsonValue;
  tableName: string;
  where?: Array<{
    column: string;
    equals: string;
  }>;
  updatedAtField?: string;
  locationKey?: string;
  entity: JsonValue;
};

export type InlineDatabaseTargetPayload = {
  sourceName: string;
  mapper: InlineDatabaseMapperSpec;
};

export type InlineMappedSourceConfig = {
  name: string;
  backend: {
    client: 'better-sqlite3' | 'pg';
    connection: JsonValue;
    tableName: string;
    where?: Array<{
      column: string;
      equals: string;
    }>;
  };
  entity: JsonValue;
  locationKeyTemplate?: string;
  updatedAtField: string;
};

export type InlineMappedSourceRecord = {
  item: Record<string, any>;
  updatedAt: string;
};

export type DatabaseLocationEntity = Entity & {
  spec: {
    type?: string;
    target?: string;
    targets?: string[];
    presence?: 'required' | 'optional';
    'x-database'?: InlineDatabaseMapperSpec;
  };
};
