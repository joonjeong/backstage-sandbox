import { EntityListProvider } from '@backstage/plugin-catalog-react';
import { ProjectCatalogContent } from './ProjectCatalogPage';
import { ResourcesLayout } from '../ResourcesLayout';

export function ProjectPage() {
  return (
    <ResourcesLayout currentTab="project">
      <EntityListProvider>
        <ProjectCatalogContent />
      </EntityListProvider>
    </ResourcesLayout>
  );
}
