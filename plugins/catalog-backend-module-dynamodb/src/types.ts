import { Entity } from '@backstage/catalog-model';
import { JsonValue } from '@backstage/config';

export const DYNAMODB_LOCATION_TYPE = 'dynamodb';

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

export type InlineDynamoDbMapperSpec = {
  region?: string;
  endpoint?: string;
  tableName: string;
  partitionKey: string;
  sortKeyPrefix?: string;
  updatedAtField?: string;
  locationKey?: string;
  entity: JsonValue;
};

export type InlineDynamoDbTargetPayload = {
  sourceName: string;
  mapper: InlineDynamoDbMapperSpec;
};

export type InlineMappedSourceConfig = {
  name: string;
  backend: {
    dynamoRegion?: string;
    dynamoTableName: string;
    dynamoEndpoint?: string;
    dynamoPartitionKey: string;
    dynamoSortKeyPrefix?: string;
  };
  entity: JsonValue;
  locationKeyTemplate?: string;
  updatedAtField: string;
};

export type InlineMappedSourceRecord = {
  item: Record<string, any>;
  updatedAt: string;
};

export type DynamoDbLocationEntity = Entity & {
  spec: {
    type?: string;
    target?: string;
    targets?: string[];
    presence?: 'required' | 'optional';
    'x-dynamodb'?: InlineDynamoDbMapperSpec;
  };
};
