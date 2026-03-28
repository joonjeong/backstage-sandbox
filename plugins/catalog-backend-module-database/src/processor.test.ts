import { ConfigReader } from '@backstage/config';
import { DATABASE_LOCATION_TYPE } from './types';
import { DatabaseLocationProcessor } from './processor';

describe('DatabaseLocationProcessor', () => {
  it('ignores non-database locations', async () => {
    const processor = new DatabaseLocationProcessor(
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

  it('normalizes inline x-database Location specs before readLocation', async () => {
    const processor = new DatabaseLocationProcessor(
      new ConfigReader({}),
      { info: jest.fn() } as any,
    );

    const processed = await processor.preProcessEntity(
      {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Location',
        metadata: {
          name: 'external-projects-database',
        },
        spec: {
          type: 'database',
          target: 'external-projects-database',
          'x-database': {
            client: 'better-sqlite3',
            connection: {
              filename: '/tmp/external-project-metadata.db',
            },
            tableName: 'external_project_metadata',
            where: [
              {
                column: 'source_name',
                equals: 'external-projects',
              },
            ],
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
          type: 'database',
          target: expect.stringMatching(/^database:\/\/inline\//),
        }),
      }),
    );
  });

  it('can use normalized inline targets in readLocation', async () => {
    const emit = jest.fn();
    const baseProcessor = new DatabaseLocationProcessor(
      new ConfigReader({}),
      { info: jest.fn() } as any,
    );
    const processed = await baseProcessor.preProcessEntity(
      {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Location',
        metadata: {
          name: 'external-projects-database',
        },
        spec: {
          type: 'database',
          target: 'external-projects-database',
          'x-database': {
            client: 'better-sqlite3',
            connection: {
              filename: '/tmp/external-project-metadata.db',
            },
            tableName: 'external_project_metadata',
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

    const processor = new DatabaseLocationProcessor(
      new ConfigReader({}),
      { info: jest.fn() } as any,
      {
        resolveTarget: target => ({
          mode: 'inline-mapped',
          sourceName: target,
          loadDocuments: async () => [
            {
              sourceName: 'external-projects-database',
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
        type: DATABASE_LOCATION_TYPE,
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
