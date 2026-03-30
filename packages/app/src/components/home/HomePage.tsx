import { Header, InfoCard, Page } from '@backstage/core-components';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import { Link as RouterLink } from 'react-router-dom';

function QuickLink({
  title,
  description,
  to,
  action,
}: {
  title: string;
  description: string;
  to: string;
  action: string;
}) {
  return (
    <InfoCard title={title}>
      <Typography variant="body2" paragraph>
        {description}
      </Typography>
      <Button color="primary" component={RouterLink} to={to} variant="outlined">
        {action}
      </Button>
    </InfoCard>
  );
}

export function HomePage() {
  return (
    <Page themeId="home">
      <Header
        title="Home"
        subtitle="Start from the main platform entry points"
      />
      <Box px={3} pb={3}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <InfoCard title="Platform Overview">
              <Typography variant="body1" paragraph>
                Use Home for the main landing experience, then move into
                Resources, APIs, Docs, or Create depending on the task.
              </Typography>
              <Typography variant="body1">
                Resources contains the inventory views as tabs: Home, Project,
                and Catalog.
              </Typography>
            </InfoCard>
          </Grid>
          <Grid item xs={12} md={4}>
            <QuickLink
              title="Resources"
              description="Browse resource views and inventory tabs."
              to="/resources/home"
              action="Open Resources"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <QuickLink
              title="APIs"
              description="Inspect registered APIs and their definitions."
              to="/api-docs"
              action="Open APIs"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <QuickLink
              title="Docs"
              description="Read technical documentation across the platform."
              to="/docs"
              action="Open Docs"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <QuickLink
              title="Create"
              description="Start a new template-driven workflow."
              to="/create"
              action="Open Create"
            />
          </Grid>
        </Grid>
      </Box>
    </Page>
  );
}
