import { InfoCard } from '@backstage/core-components';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import { Link as RouterLink } from 'react-router-dom';
import { ResourcesLayout } from '../ResourcesLayout';

export function ResourcesHomePage() {
  return (
    <ResourcesLayout currentTab="home">
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
    </ResourcesLayout>
  );
}
