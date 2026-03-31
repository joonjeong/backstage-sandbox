import { useEffect, useState } from 'react';
import { Card, CardContent, Chip, Typography } from '@material-ui/core';
import { InfoCard, Table, type TableColumn } from '@backstage/core-components';
import type { TopologyModel } from '../models/Topology.model';
import {
  getDefaultSelectedNodeId,
  getSelectedNodeSummary,
  getVisibleNodeRows,
  type TopologyVisibleNodeRow,
} from '../models/Topology.view-model';
import { TopologyCanvas } from './TopologyCanvas';
import { EntityLinkWithIcon } from './EntityLink';
import { TopologyInspectorLane } from './TopologyInspectorLane';
import { useTopologyStyles } from './topologyStyles';

export function ServiceTopology({
  model,
  inventoryOnly = false,
}: {
  model: TopologyModel;
  inventoryOnly?: boolean;
}) {
  const classes = useTopologyStyles();
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>(() =>
    getDefaultSelectedNodeId(model),
  );

  useEffect(() => {
    const hasSelectedNode =
      selectedNodeId &&
      model.nodes.some(candidate => candidate.id === selectedNodeId);
    const nextSelectedNodeId = hasSelectedNode
      ? selectedNodeId
      : getDefaultSelectedNodeId(model);

    if (nextSelectedNodeId !== selectedNodeId) {
      setSelectedNodeId(nextSelectedNodeId);
    }
  }, [model, selectedNodeId]);

  if (model.nodes.length <= 1) {
    return (
      <Card variant="outlined">
        <CardContent className={classes.empty}>
          <Typography variant="h6">No mapped components found</Typography>
          <Typography color="textSecondary">
            Add `kabang.cloud/project` annotations to project components and
            edge stacks to render a traffic topology.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const selectedSummary = getSelectedNodeSummary(model, selectedNodeId);
  const visibleNodeRows = getVisibleNodeRows(model);
  const inventoryColumns: TableColumn<TopologyVisibleNodeRow>[] = [
    {
      title: 'Name',
      render: row => (
        <>
          <Typography variant="body2" className={classes.cellTitle}>
            {row.title}
          </Typography>
          {row.subtitle && (
            <Typography variant="body2" className={classes.cellSubtle}>
              {row.subtitle}
            </Typography>
          )}
        </>
      ),
    },
    {
      title: 'Zone',
      render: row => (
        <Typography variant="body2" className={classes.cellSubtle}>
          {row.zone}
        </Typography>
      ),
    },
    {
      title: 'Exposure',
      render: row => (
        <Chip
          label={row.exposure}
          size="small"
          className={classes.chipCompact}
        />
      ),
    },
    {
      title: 'Traffic',
      render: row => (
        <Typography variant="body2" className={classes.cellSubtle}>
          {row.incomingCount} in / {row.outgoingCount} out
        </Typography>
      ),
    },
    {
      title: 'Entity',
      render: row =>
        row.componentKind === 'component' && row.entityRef ? (
          <EntityLinkWithIcon entityRef={row.entityRef} label={row.title} />
        ) : (
          <Typography variant="body2" className={classes.cellSubtle}>
            {row.entityRef ?? row.id}
          </Typography>
        ),
    },
  ];

  if (inventoryOnly) {
    return (
      <InfoCard
        title="Service Topology Inventory"
        subheader="Nodes currently represented in the topology, including shared edge stacks and project components."
      >
        <Table
          columns={inventoryColumns}
          data={visibleNodeRows}
          options={{
            paging: false,
            search: false,
            toolbar: false,
            padding: 'dense',
          }}
          onRowClick={(_event, row) => setSelectedNodeId(row?.id)}
        />
      </InfoCard>
    );
  }

  return (
    <div className={classes.section}>
      <InfoCard
        title="Service Topology"
        subheader="Traffic-oriented topology for the current project, including domain-record entry points, shared edge stacks, and downstream components."
      >
        <div className={classes.wrapper}>
          <TopologyCanvas
            model={model}
            selectedNodeId={selectedNodeId}
            onSelectedNodeIdChange={setSelectedNodeId}
          />
          <TopologyInspectorLane selectedSummary={selectedSummary} />
        </div>
      </InfoCard>
    </div>
  );
}
