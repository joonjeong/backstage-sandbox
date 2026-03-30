import type { Entity } from '@backstage/catalog-model';
import {
  CodeSnippet,
  Content,
  Header,
  Page,
  TableColumn,
} from '@backstage/core-components';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import Grid from '@material-ui/core/Grid';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import EditIcon from '@material-ui/icons/Edit';
import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { CatalogTable, type CatalogTableRow } from '@backstage/plugin-catalog';
import {
  EntityKindFilter,
  EntityListProvider,
  EntityRefLink,
  EntityUserFilter,
  useEntityList,
} from '@backstage/plugin-catalog-react';
import {
  buildProjectEntityYaml,
  emptyProjectScenarioValues,
  projectScenarioValuesFromEntity,
  type ProjectScenarioValues,
} from './project/projectScenario';

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

type ProjectScenarioState = {
  mode: 'new' | 'modify';
  values: ProjectScenarioValues;
  entity?: Entity;
};

function ProjectScenarioDialog({
  state,
  onClose,
  onChange,
}: {
  state: ProjectScenarioState | null;
  onClose: () => void;
  onChange: (field: keyof ProjectScenarioValues, value: string) => void;
}) {
  if (!state) {
    return null;
  }

  const yaml = buildProjectEntityYaml(state.values);
  const isModify = state.mode === 'modify';
  const entityPath = state.entity
    ? `/catalog/default/project/${state.entity.metadata.name}`
    : undefined;

  return (
    <Dialog fullWidth maxWidth="lg" onClose={onClose} open>
      <DialogTitle>
        {isModify ? 'Modify Project Scenario' : 'New Project Scenario'}
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={3}>
          <Grid item md={6} xs={12}>
            <Typography color="textSecondary" variant="body2">
              {isModify
                ? 'The existing project values are preloaded so you can plan the update path before applying it.'
                : 'Fill in the project metadata to shape a new Project entity scenario.'}
            </Typography>
            <Box mt={2}>
              <Grid container spacing={2}>
                <Grid item sm={6} xs={12}>
                  <TextField
                    fullWidth
                    label="Name"
                    onChange={event => onChange('name', event.target.value)}
                    value={state.values.name}
                  />
                </Grid>
                <Grid item sm={6} xs={12}>
                  <TextField
                    fullWidth
                    label="Title"
                    onChange={event => onChange('title', event.target.value)}
                    value={state.values.title}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Description"
                    multiline
                    onChange={event =>
                      onChange('description', event.target.value)
                    }
                    rows={3}
                    value={state.values.description}
                  />
                </Grid>
                <Grid item sm={6} xs={12}>
                  <TextField
                    fullWidth
                    label="Owner"
                    onChange={event => onChange('owner', event.target.value)}
                    value={state.values.owner}
                  />
                </Grid>
                <Grid item sm={6} xs={12}>
                  <TextField
                    fullWidth
                    label="Team"
                    onChange={event => onChange('team', event.target.value)}
                    value={state.values.team}
                  />
                </Grid>
              </Grid>
            </Box>
          </Grid>
          <Grid item md={6} xs={12}>
            <Typography color="textSecondary" gutterBottom variant="body2">
              Generated entity YAML
            </Typography>
            <CodeSnippet
              language="yaml"
              showCopyCodeButton
              text={yaml}
              wrapLongLines
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        {entityPath ? (
          <Button component={RouterLink} to={entityPath}>
            Open Current Project
          </Button>
        ) : (
          <Button component={RouterLink} to="/catalog-import">
            Open Catalog Import
          </Button>
        )}
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

export function ProjectCatalogContent() {
  const [scenario, setScenario] = useState<ProjectScenarioState | null>(null);

  const actions = useMemo(
    () => [
      {
        icon: EditIcon,
        tooltip: 'Modify project scenario',
        onClick: (
          _event: unknown,
          rowData: CatalogTableRow | CatalogTableRow[],
        ) => {
          if (Array.isArray(rowData)) {
            return;
          }

          setScenario({
            mode: 'modify',
            values: projectScenarioValuesFromEntity(rowData.entity),
            entity: rowData.entity,
          });
        },
      },
    ],
    [],
  );

  return (
    <>
      <ProjectTableFilters />
      <Box display="flex" justifyContent="flex-end" mb={2}>
        <Button
          color="primary"
          onClick={() =>
            setScenario({
              mode: 'new',
              values: emptyProjectScenarioValues,
            })
          }
          variant="contained"
        >
          New Project
        </Button>
      </Box>
      <Typography color="textSecondary" paragraph variant="body2">
        Use `New Project` to draft a fresh project entity. Use the row-level
        action in `Actions` to open the same scenario with an existing project
        prefilled.
      </Typography>
      <CatalogTable
        actions={actions}
        columns={projectColumns}
        title=" "
        tableOptions={{
          search: true,
          paging: true,
          pageSize: 20,
          padding: 'dense',
        }}
      />
      <ProjectScenarioDialog
        onChange={(field, value) =>
          setScenario(current =>
            current
              ? {
                  ...current,
                  values: {
                    ...current.values,
                    [field]: value,
                  },
                }
              : current,
          )
        }
        onClose={() => setScenario(null)}
        state={scenario}
      />
    </>
  );
}

export const projectCatalogPage = (
  <Page themeId="home">
    <Header title="Projects" subtitle="Catalog project inventory" />
    <Content>
      <EntityListProvider>
        <ProjectCatalogContent />
      </EntityListProvider>
    </Content>
  </Page>
);
