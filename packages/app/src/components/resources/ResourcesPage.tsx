import {
  Content,
  ContentHeader,
  Header,
  HeaderTabs,
  InfoCard,
  Link,
  Page,
} from '@backstage/core-components';
import { CatalogTable } from '@backstage/plugin-catalog';
import {
  CatalogFilterLayout,
  DefaultFilters,
  EntityListProvider,
} from '@backstage/plugin-catalog-react';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import { useMemo } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { ProjectCatalogContent } from '../catalog/ProjectCatalogPage';

function ResourcesHomeContent() {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={7}>
        <InfoCard title="Resources Home">
          <Typography variant="body1" paragraph>
            Resources collects the main inventory views in one place.
          </Typography>
          <Typography variant="body1" paragraph>
            Use the Project tab to focus on project entities, or switch to
            Catalog for the broader software catalog.
          </Typography>
          <Box mt={3} display="flex" flexWrap="wrap" style={{ gap: 12 }}>
            <Button
              color="primary"
              component={RouterLink}
              to="/resources/project"
              variant="contained"
            >
              Open Project
            </Button>
            <Button
              color="primary"
              component={RouterLink}
              to="/resources/catalog"
              variant="outlined"
            >
              Open Catalog
            </Button>
          </Box>
        </InfoCard>
      </Grid>
      <Grid item xs={12} md={5}>
        <InfoCard title="Quick Guide">
          <Typography variant="body2" paragraph>
            Home: resource-area overview and shortcuts.
          </Typography>
          <Typography variant="body2" paragraph>
            Project: project-only inventory table.
          </Typography>
          <Typography variant="body2">
            Catalog: full entity catalog with filters.
          </Typography>
        </InfoCard>
      </Grid>
    </Grid>
  );
}

function ResourcesProjectContent() {
  return (
    <>
      <ContentHeader title="Project" />
      <EntityListProvider>
        <ProjectCatalogContent />
      </EntityListProvider>
    </>
  );
}

function ResourcesCatalogContent() {
  return (
    <>
      <ContentHeader title="Catalog" />
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
    </>
  );
}

export function ResourcesPage() {
  const location = useLocation();
  const currentTab = useMemo(() => {
    if (location.pathname.startsWith('/resources/project')) {
      return 'project';
    }

    if (location.pathname.startsWith('/resources/catalog')) {
      return 'catalog';
    }

    return 'home';
  }, [location.pathname]);

  const tabs = [
    {
      id: 'home',
      label: 'Home',
      tabProps: { component: Link, to: '/resources/home' },
    },
    {
      id: 'project',
      label: 'Project',
      tabProps: { component: Link, to: '/resources/project' },
    },
    {
      id: 'catalog',
      label: 'Catalog',
      tabProps: { component: Link, to: '/resources/catalog' },
    },
  ];

  const selectedIndex = tabs.findIndex(tab => tab.id === currentTab);

  return (
    <Page themeId="home">
      <Header
        title="Resources"
        subtitle="Browse the platform inventory by view"
      />
      <HeaderTabs tabs={tabs} selectedIndex={selectedIndex} />
      <Content>
        {currentTab === 'project' ? (
          <ResourcesProjectContent />
        ) : currentTab === 'catalog' ? (
          <ResourcesCatalogContent />
        ) : (
          <ResourcesHomeContent />
        )}
      </Content>
    </Page>
  );
}
