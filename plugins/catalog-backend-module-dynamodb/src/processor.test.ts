import { ConfigReader } from '@backstage/config';
import { DYNAMODB_LOCATION_TYPE } from './types';
import {
  DynamoDbLocationProcessor,
  parseRawDynamoDbLocationTarget,
} from './processor';

describe('parseRawDynamoDbLocationTarget', () => {
  it('rejects raw source mode for the generic dynamodb module', () => {
    expect(() => parseRawDynamoDbLocationTarget('raw:groups')).toThrow(
      /raw:<source> is not supported/,
    );
  });
});

describe('DynamoDbLocationProcessor', () => {
  it('ignores non-dynamodb locations', async () => {
    const processor = new DynamoDbLocationProcessor(
      new ConfigReader({}),
      { info: jest.fn() } as any,
    );

    const handled = await processor.readLocation(
      { type: 'url', target: 'https://example.com/catalog-info.yaml' },
      false,
      jest.fn(),
      jest.fn() as any,
      {} as any,
    );

    expect(handled).toBe(false);
  });

  it('emits input errors for invalid targets', async () => {
    const emit = jest.fn();
    const processor = new DynamoDbLocationProcessor(
      new ConfigReader({}),
      { info: jest.fn() } as any,
    );

    await processor.readLocation(
      {
        type: DYNAMODB_LOCATION_TYPE,
        target: 'external-projects',
      },
      false,
      emit,
      jest.fn() as any,
      {} as any,
    );

    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
      }),
    );
  });

  it('normalizes inline x-dynamodb Location specs before readLocation', async () => {
    const processor = new DynamoDbLocationProcessor(
      new ConfigReader({}),
      { info: jest.fn() } as any,
    );

    const processed = await processor.preProcessEntity(
      {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Location',
        metadata: {
          name: 'external-projects',
        },
        spec: {
          type: 'dynamodb',
          target: 'external-projects',
          'x-dynamodb': {
            region: 'ap-northeast-2',
            tableName: 'external-project-metadata',
            partitionKey: 'SOURCE#projects',
            sortKeyPrefix: 'PROJECT#',
            updatedAtField: 'modified_at',
            entity: {
              apiVersion: 'backstage.io/v1alpha1',
              kind: 'Component',
              metadata: {
                name: '{{ item.project_code }}',
              },
              spec: {
                type: 'external',
                owner: 'group:default/platform',
                lifecycle: 'production',
              },
            },
          },
        },
      } as any,
      { type: 'file', target: '/tmp/location.yaml' },
    );

    expect(processed).toEqual(
      expect.objectContaining({
        spec: expect.objectContaining({
          type: 'dynamodb',
          target: expect.stringMatching(/^dynamodb:\/\/inline\//),
        }),
      }),
    );
  });

  it('can use normalized inline targets in readLocation', async () => {
    const emit = jest.fn();
    const baseProcessor = new DynamoDbLocationProcessor(
      new ConfigReader({}),
      { info: jest.fn() } as any,
    );
    const processed = await baseProcessor.preProcessEntity(
      {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Location',
        metadata: {
          name: 'external-projects',
        },
        spec: {
          type: 'dynamodb',
          target: 'external-projects',
          'x-dynamodb': {
            region: 'ap-northeast-2',
            tableName: 'external-project-metadata',
            partitionKey: 'SOURCE#projects',
            sortKeyPrefix: 'PROJECT#',
            updatedAtField: 'modified_at',
            entity: {
              apiVersion: 'backstage.io/v1alpha1',
              kind: 'Component',
              metadata: {
                name: '{{ item.project_code }}',
              },
              spec: {
                type: 'external',
                owner: 'group:default/platform',
                lifecycle: 'production',
              },
            },
          },
        },
      } as any,
      { type: 'file', target: '/tmp/location.yaml' },
    );

    const processor = new DynamoDbLocationProcessor(
      new ConfigReader({}),
      { info: jest.fn() } as any,
      {
        resolveTarget: target => ({
          mode: 'inline-mapped',
          sourceName: target,
          loadDocuments: async () => [
            {
              sourceName: 'external-projects',
              entityRef: 'component:default/payments-api',
              locationKey: 'external:component:default/payments-api',
              updatedAt: '2026-03-28T00:00:00.000Z',
              entity: {
                apiVersion: 'backstage.io/v1alpha1',
                kind: 'Component',
                metadata: {
                  name: 'payments-api',
                },
                spec: {
                  type: 'external',
                  lifecycle: 'production',
                  owner: 'group:default/platform',
                },
              },
            },
          ],
        }),
      },
    );

    await processor.readLocation(
      {
        type: DYNAMODB_LOCATION_TYPE,
        target: String((processed.spec as any).target),
      },
      false,
      emit,
      jest.fn() as any,
      {} as any,
    );

    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'entity',
      }),
    );
  });
});
