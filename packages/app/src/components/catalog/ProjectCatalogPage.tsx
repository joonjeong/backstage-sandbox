import { useEffect } from 'react';
import {
  CatalogTable,
  type CatalogTableRow,
} from '@backstage/plugin-catalog';
import {
  EntityKindFilter,
  EntityListProvider,
  EntityRefLink,
  EntityUserFilter,
  useEntityList,
} from '@backstage/plugin-catalog-react';
import { Content, Header, Page, TableColumn } from '@backstage/core-components';

function ProjectTableFilters() {
  const { filters, updateFilters } = useEntityList();

  useEffect(() => {
    const updates: Record<string, unknown> = {};

    if (filters.kind?.value !== 'project') {
      updates.kind = new EntityKindFilter('project', 'Project');
    }

    if (filters.user?.value !== 'all') {
      updates.user = EntityUserFilter.all();
    }

    if (Object.keys(updates).length > 0) {
      updateFilters(updates);
    }
  }, [filters.kind?.value, filters.user?.value, updateFilters]);

  return null;
}

const projectColumns: TableColumn<CatalogTableRow>[] = [
  CatalogTable.columns.createNameColumn({ defaultKind: 'Project' }),
  {
    title: 'Title',
    field: 'entity.metadata.title',
  },
  {
    title: 'Owner',
    field: 'entity.spec.owner',
    render: ({ entity }) => (
      <EntityRefLink entityRef={String(entity.spec?.owner ?? '')} />
    ),
  },
  {
    title: 'Team',
    field: 'entity.spec.team',
    render: ({ entity }) => (
      <EntityRefLink entityRef={String(entity.spec?.team ?? '')} />
    ),
  },
  CatalogTable.columns.createMetadataDescriptionColumn(),
];

export const projectCatalogPage = (
  <Page themeId="home">
    <Header title="Projects" subtitle="Catalog project inventory" />
    <Content>
      <EntityListProvider>
        <ProjectTableFilters />
        <CatalogTable
          columns={projectColumns}
          title="Projects"
          tableOptions={{
            search: true,
            paging: true,
            pageSize: 20,
            padding: 'dense',
          }}
        />
      </EntityListProvider>
    </Content>
  </Page>
);
