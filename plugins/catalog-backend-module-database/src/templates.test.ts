import { toMappedCatalogEntityDocument } from './templates';

describe('toMappedCatalogEntityDocument', () => {
  it('stringifies metadata annotations and labels', () => {
    const document = toMappedCatalogEntityDocument(
      {
        name: 'sample-projects',
        backend: {
          client: 'better-sqlite3',
          connection: {
            filename: '/tmp/sample.db',
          },
          tableName: 'project_metadata',
        },
        entity: {
          apiVersion: 'kabang.cloud/v1',
          kind: 'Project',
          metadata: {
            name: '{{ item.project_name }}',
            annotations: {
              'example.com/source-row-id': '{{ item.id }}',
            },
            labels: {
              'example.com/revision': '{{ item.revision }}',
            },
          },
          spec: {
            owner: '{{ item.owner_ref }}',
            team: '{{ item.team_ref }}',
          },
        },
        updatedAtField: 'modified_at',
      },
      {
        item: {
          id: 42,
          revision: 7,
          project_name: 'guest-ops-console',
          owner_ref: 'guest',
          team_ref: 'guests',
          modified_at: '2026-03-29T00:05:00.000Z',
        },
        updatedAt: '2026-03-29T00:05:00.000Z',
      },
    );

    expect(document.entity.metadata.annotations).toEqual(
      expect.objectContaining({
        'example.com/source-row-id': '42',
      }),
    );
    expect(document.entity.metadata.labels).toEqual(
      expect.objectContaining({
        'example.com/revision': '7',
      }),
    );
  });
});
