import { EntityListProvider } from '@backstage/plugin-catalog-react';
import { ProjectCatalogContent } from '../../catalog/ProjectCatalogPage';
import { ResourcesLayout } from '../ResourcesLayout';

export function ResourcesProjectPage() {
  return (
    <ResourcesLayout currentTab="project">
      <EntityListProvider>
        <ProjectCatalogContent />
      </EntityListProvider>
    </ResourcesLayout>
  );
}
