import { CatalogTable } from '@backstage/plugin-catalog';
import {
  CatalogFilterLayout,
  DefaultFilters,
  EntityListProvider,
} from '@backstage/plugin-catalog-react';
import { ResourcesLayout } from '../ResourcesLayout';

export function ResourcesCatalogPage() {
  return (
    <ResourcesLayout currentTab="catalog">
      <EntityListProvider>
        <CatalogFilterLayout>
          <CatalogFilterLayout.Filters>
            <DefaultFilters />
          </CatalogFilterLayout.Filters>
          <CatalogFilterLayout.Content>
            <CatalogTable />
          </CatalogFilterLayout.Content>
        </CatalogFilterLayout>
      </EntityListProvider>
    </ResourcesLayout>
  );
}
