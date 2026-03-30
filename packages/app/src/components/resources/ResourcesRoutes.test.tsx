import type { ReactNode } from 'react';
import { screen } from '@testing-library/react';
import { renderInTestApp } from '@backstage/test-utils';
import { Route, Routes } from 'react-router-dom';
import { ResourcesCatalogPage } from './catalog/ResourcesCatalogPage';
import { ResourcesHomePage } from './home/ResourcesHomePage';
import { ResourcesProjectPage } from './project/ResourcesProjectPage';

jest.mock('../catalog/ProjectCatalogPage', () => ({
  ProjectCatalogContent: () => <div>Project catalog content</div>,
}));

jest.mock('@backstage/plugin-catalog', () => ({
  CatalogTable: () => <div>Catalog table content</div>,
}));

jest.mock('@backstage/plugin-catalog-react', () => {
  const passthrough = ({ children }: { children?: ReactNode }) => <>{children}</>;

  const CatalogFilterLayout = Object.assign(passthrough, {
    Filters: passthrough,
    Content: passthrough,
  });

  return {
    CatalogFilterLayout,
    DefaultFilters: () => <div>Default filters</div>,
    EntityListProvider: passthrough,
  };
});

async function renderResourcesRoute(route: string) {
  return renderInTestApp(
    <Routes>
      <Route path="/resources/home" element={<ResourcesHomePage />} />
      <Route path="/resources/project" element={<ResourcesProjectPage />} />
      <Route path="/resources/catalog" element={<ResourcesCatalogPage />} />
    </Routes>,
    { routeEntries: [route] },
  );
}

describe('Resources routes', () => {
  it('renders the home view for /resources/home', async () => {
    await renderResourcesRoute('/resources/home');

    expect(screen.getByText('Resources Home')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Open Project' }),
    ).toHaveAttribute('href', '/resources/project');
  });

  it('renders the project view for /resources/project', async () => {
    await renderResourcesRoute('/resources/project');

    expect(screen.getByText('Project catalog content')).toBeInTheDocument();
  });

  it('renders the catalog view for /resources/catalog', async () => {
    await renderResourcesRoute('/resources/catalog');

    expect(screen.getByText('Default filters')).toBeInTheDocument();
    expect(screen.getByText('Catalog table content')).toBeInTheDocument();
  });
});
