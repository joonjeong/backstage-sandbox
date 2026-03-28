import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  makeStyles,
  Typography,
} from '@material-ui/core';
import { useApi } from '@backstage/core-plugin-api';
import {
  catalogApiRef,
  EntityRefLink,
  useEntity,
} from '@backstage/plugin-catalog-react';
import type { Entity } from '@backstage/catalog-model';
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  type Edge,
  type Node,
  type NodeMouseHandler,
  type NodeProps,
  Panel,
  Position,
  ReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  buildProjectServiceMapModel,
  getProjectComponentFilter,
  type ProjectServiceMapModel,
  type ServiceMapNode,
  type ServiceMapZone,
} from './ProjectServiceMap.model';

const useStyles = makeStyles(theme => ({
  wrapper: {
    height: 760,
    borderRadius: theme.shape.borderRadius,
    border: `1px solid ${theme.palette.divider}`,
    overflow: 'hidden',
    background:
      'radial-gradient(circle at top left, rgba(33, 150, 243, 0.08), transparent 32%), linear-gradient(180deg, #f8fbff 0%, #f4f7fb 100%)',
  },
  canvas: {
    width: '100%',
    height: '100%',
  },
  loading: {
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeCard: {
    width: 240,
    borderRadius: 18,
    border: '1px solid rgba(15, 23, 42, 0.08)',
    boxShadow: '0 18px 40px rgba(15, 23, 42, 0.12)',
    background: '#ffffff',
    cursor: 'pointer',
    transition:
      'transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease',
  },
  nodeCardSelected: {
    transform: 'translateY(-2px)',
    boxShadow: '0 22px 48px rgba(37, 99, 235, 0.22)',
    borderColor: 'rgba(37, 99, 235, 0.42)',
  },
  nodeCardPublic: {
    background: 'linear-gradient(180deg, #ffffff 0%, #f2f8ff 100%)',
    borderColor: 'rgba(30, 136, 229, 0.32)',
  },
  nodeCardPrivate: {
    background: 'linear-gradient(180deg, #ffffff 0%, #f5f7fa 100%)',
  },
  nodeCardExternal: {
    background: 'linear-gradient(180deg, #ffffff 0%, #faf5ee 100%)',
    borderStyle: 'dashed',
  },
  nodeCardIngress: {
    background: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%)',
    color: '#fff',
    borderColor: 'rgba(29, 78, 216, 0.4)',
  },
  nodeHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing(1),
  },
  nodeTitle: {
    fontWeight: 700,
    fontSize: '0.95rem',
    color: '#111827',
  },
  nodeTitleLight: {
    color: '#ffffff',
  },
  nodeSubtitle: {
    color: 'rgba(15, 23, 42, 0.82)',
    fontSize: '0.78rem',
    lineHeight: 1.4,
  },
  nodeSubtitleLight: {
    color: 'rgba(255, 255, 255, 0.94)',
  },
  nodeBadge: {
    textTransform: 'uppercase',
    fontSize: '0.64rem',
    letterSpacing: '0.08em',
    fontWeight: 700,
  },
  zoneCard: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    border: '1px solid rgba(148, 163, 184, 0.28)',
    background: 'rgba(255, 255, 255, 0.62)',
    backdropFilter: 'blur(3px)',
    padding: theme.spacing(2.5),
    boxSizing: 'border-box',
  },
  zoneHeader: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: theme.spacing(1),
  },
  zoneTitle: {
    fontSize: '0.82rem',
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#0f172a',
  },
  zoneDescription: {
    fontSize: '0.75rem',
    color: 'rgba(15, 23, 42, 0.76)',
  },
  legend: {
    borderRadius: 16,
    border: '1px solid rgba(15, 23, 42, 0.08)',
    background: 'rgba(255, 255, 255, 0.98)',
    boxShadow: '0 12px 28px rgba(15, 23, 42, 0.12)',
    padding: theme.spacing(1.5),
    minWidth: 220,
  },
  legendTitle: {
    color: '#111827',
    fontWeight: 800,
  },
  legendRow: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    marginTop: theme.spacing(1),
  },
  legendText: {
    color: '#1f2937',
    fontWeight: 600,
  },
  legendSwatch: {
    width: 12,
    height: 12,
    borderRadius: 999,
    flexShrink: 0,
  },
  empty: {
    padding: theme.spacing(6),
    textAlign: 'center',
  },
  error: {
    padding: theme.spacing(4),
  },
  inspector: {
    borderRadius: 18,
    border: '1px solid rgba(15, 23, 42, 0.08)',
    background: 'rgba(255, 255, 255, 0.99)',
    boxShadow: '0 12px 28px rgba(15, 23, 42, 0.12)',
    padding: theme.spacing(2),
    width: 280,
  },
  inspectorTitle: {
    fontWeight: 800,
    marginBottom: theme.spacing(0.5),
    color: '#111827',
  },
  inspectorSubtitle: {
    color: '#4b5563',
    marginBottom: theme.spacing(1.5),
  },
  inspectorRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: theme.spacing(2),
    marginTop: theme.spacing(1),
  },
  inspectorLabel: {
    color: '#6b7280',
    fontSize: '0.78rem',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontWeight: 700,
  },
  inspectorValue: {
    fontWeight: 700,
    textAlign: 'right',
    color: '#111827',
  },
  inspectorHint: {
    color: '#374151',
    fontWeight: 500,
  },
}));

type FlowNodeData = {
  node: ServiceMapNode;
};

type ZoneNodeData = {
  zone: ServiceMapZone;
};

function toneColor(tone: ServiceMapNode['tone']): string {
  switch (tone) {
    case 'entry':
      return '#38bdf8';
    case 'public':
      return '#1d4ed8';
    case 'external':
      return '#c2410c';
    case 'private':
    default:
      return '#0f172a';
  }
}

function edgeColor(tone: Edge['data'] extends { tone: infer T } ? T : unknown) {
  switch (tone) {
    case 'entry':
      return '#0284c7';
    case 'dependency':
      return '#ea580c';
    case 'traffic':
    default:
      return '#2563eb';
  }
}

function getNodeCardClassName(
  classes: ReturnType<typeof useStyles>,
  tone: ServiceMapNode['tone'],
  selected: boolean,
): string {
  const toneClassName = (() => {
    switch (tone) {
      case 'entry':
        return classes.nodeCardIngress;
      case 'public':
        return classes.nodeCardPublic;
      case 'external':
        return classes.nodeCardExternal;
      case 'private':
      default:
        return classes.nodeCardPrivate;
    }
  })();

  return `${toneClassName} ${selected ? classes.nodeCardSelected : ''}`;
}

function ServiceNodeCard({ data, selected }: NodeProps<Node<FlowNodeData>>) {
  const classes = useStyles();
  const { node } = data;
  const accent = toneColor(node.tone);
  const cardClassName = getNodeCardClassName(classes, node.tone, selected);

  return (
    <>
      {node.kind !== 'ingress' && (
        <Handle
          type="target"
          position={Position.Left}
          style={{ background: accent, width: 10, height: 10 }}
        />
      )}
      <Card
        className={`${classes.nodeCard} ${cardClassName}`}
        style={{ borderTop: `4px solid ${accent}` }}
        elevation={0}
      >
        <CardContent>
          <div className={classes.nodeHeader}>
            <Typography
              className={`${classes.nodeTitle} ${
                node.tone === 'entry' ? classes.nodeTitleLight : ''
              }`}
            >
              {node.title}
            </Typography>
            <Chip
              label={node.exposure ?? node.kind}
              size="small"
              className={classes.nodeBadge}
              style={{
                background:
                  node.tone === 'entry'
                    ? 'rgba(255, 255, 255, 0.16)'
                    : `${accent}14`,
                color: node.tone === 'entry' ? '#fff' : accent,
              }}
            />
          </div>
          {node.subtitle && (
            <Typography
              className={`${classes.nodeSubtitle} ${
                node.tone === 'entry' ? classes.nodeSubtitleLight : ''
              }`}
            >
              {node.subtitle}
            </Typography>
          )}
        </CardContent>
      </Card>
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: accent, width: 10, height: 10 }}
      />
    </>
  );
}

function ZoneNode({ data }: NodeProps<Node<ZoneNodeData>>) {
  const classes = useStyles();

  return (
    <div className={classes.zoneCard}>
      <div className={classes.zoneHeader}>
        <Typography className={classes.zoneTitle}>{data.zone.title}</Typography>
      </div>
      <Typography className={classes.zoneDescription}>
        {data.zone.description}
      </Typography>
    </div>
  );
}

function buildFlow(
  model: ProjectServiceMapModel,
  selectedNodeId?: string,
): {
  nodes: Node[];
  edges: Edge[];
} {
  const zoneOrder = model.zones.map(zone => zone.id);
  const zoneIndexLookup = new Map(zoneOrder.map((zoneId, index) => [zoneId, index]));
  const componentNodes = model.nodes.filter(
    node => node.kind === 'component',
  );
  const nodeWidth = 240;
  const nodeHeight = 96;
  const nodeGapX = 48;
  const nodeGapY = 28;
  const minZoneWidth = 460;
  const minZoneHeight = 280;
  const zoneGap = 72;
  const zoneStartX = 380;
  const zoneStartY = 72;
  const zoneHeaderHeight = 72;
  const zonePaddingX = 32;
  const zonePaddingTop = 36;
  const zonePaddingBottom = 32;
  const ingressX = 56;
  const defaultIngressY = 196;

  const outgoingBySource = new Map<string, string[]>();

  for (const edge of model.edges) {
    const outgoing = outgoingBySource.get(edge.source) ?? [];
    outgoing.push(edge.target);
    outgoingBySource.set(edge.source, outgoing);
  }

  const nodesByZone = new Map<string, ServiceMapNode[]>();
  for (const zone of zoneOrder) {
    nodesByZone.set(zone, []);
  }

  for (const node of componentNodes) {
    const zoneNodes = nodesByZone.get(node.zone) ?? [];
    zoneNodes.push(node);
    nodesByZone.set(node.zone, zoneNodes);
  }

  const localColumnByNode = new Map<string, number>();
  const nodeById = new Map(model.nodes.map(node => [node.id, node]));

  for (const node of componentNodes) {
    localColumnByNode.set(node.id, 0);
  }

  for (let iteration = 0; iteration < componentNodes.length; iteration += 1) {
    let changed = false;

    for (const edge of model.edges) {
      const sourceNode = nodeById.get(edge.source);
      const targetNode = nodeById.get(edge.target);

      if (!sourceNode || !targetNode || targetNode.kind !== 'component') {
        continue;
      }

      const nextColumn =
        sourceNode.kind === 'component' && sourceNode.zone === targetNode.zone
          ? (localColumnByNode.get(sourceNode.id) ?? 0) + 1
          : 0;

      if ((localColumnByNode.get(targetNode.id) ?? 0) < nextColumn) {
        localColumnByNode.set(targetNode.id, nextColumn);
        changed = true;
      }
    }

    if (!changed) {
      break;
    }
  }

  const preferredRowByNode = new Map<string, number>();
  preferredRowByNode.set('public-traffic', 0);

  const traversalOrder = [...componentNodes].sort((left, right) => {
    const leftZone = zoneIndexLookup.get(left.zone) ?? 0;
    const rightZone = zoneIndexLookup.get(right.zone) ?? 0;
    if (leftZone !== rightZone) {
      return leftZone - rightZone;
    }

    const leftColumn = localColumnByNode.get(left.id) ?? 0;
    const rightColumn = localColumnByNode.get(right.id) ?? 0;
    if (leftColumn !== rightColumn) {
      return leftColumn - rightColumn;
    }

    return left.title.localeCompare(right.title);
  });

  for (const sourceId of ['public-traffic', ...traversalOrder.map(node => node.id)]) {
    const sourceRow = preferredRowByNode.get(sourceId) ?? 0;
    const outgoingTargets = (outgoingBySource.get(sourceId) ?? [])
      .map(targetId => nodeById.get(targetId))
      .filter((node): node is ServiceMapNode => Boolean(node))
      .sort((left, right) => {
        const leftZone = zoneIndexLookup.get(left.zone) ?? 0;
        const rightZone = zoneIndexLookup.get(right.zone) ?? 0;
        if (leftZone !== rightZone) {
          return leftZone - rightZone;
        }

        const leftColumn = localColumnByNode.get(left.id) ?? 0;
        const rightColumn = localColumnByNode.get(right.id) ?? 0;
        if (leftColumn !== rightColumn) {
          return leftColumn - rightColumn;
        }

        return left.title.localeCompare(right.title);
      });

    outgoingTargets.forEach((targetNode, branchIndex) => {
      const preferredRow = sourceRow + branchIndex;
      const currentRow = preferredRowByNode.get(targetNode.id);

      if (currentRow === undefined || preferredRow < currentRow) {
        preferredRowByNode.set(targetNode.id, preferredRow);
      }
    });
  }

  const positionedRows = new Map<string, number>();
  const positionedColumns = new Map<string, number>();
  const zoneLayoutMetrics = new Map<
    string,
    {
      rows: number;
      columns: number;
      width: number;
      height: number;
      x: number;
    }
  >();

  let currentZoneX = zoneStartX;
  for (const zoneId of zoneOrder) {
    const zoneNodes = [...(nodesByZone.get(zoneId) ?? [])].sort((left, right) => {
      const leftColumn = localColumnByNode.get(left.id) ?? 0;
      const rightColumn = localColumnByNode.get(right.id) ?? 0;
      if (leftColumn !== rightColumn) {
        return leftColumn - rightColumn;
      }

      const leftRow = preferredRowByNode.get(left.id) ?? 0;
      const rightRow = preferredRowByNode.get(right.id) ?? 0;
      if (leftRow !== rightRow) {
        return leftRow - rightRow;
      }

      return left.title.localeCompare(right.title);
    });

    const occupiedRowsByColumn = new Map<number, Set<number>>();

    for (const node of zoneNodes) {
      const column = localColumnByNode.get(node.id) ?? 0;
      const preferredRow = preferredRowByNode.get(node.id) ?? 0;
      const occupiedRows = occupiedRowsByColumn.get(column) ?? new Set<number>();
      let row = preferredRow;

      while (occupiedRows.has(row)) {
        row += 1;
      }

      occupiedRows.add(row);
      occupiedRowsByColumn.set(column, occupiedRows);
      positionedColumns.set(node.id, column);
      positionedRows.set(node.id, row);
    }

    const maxColumn =
      Math.max(...zoneNodes.map(node => positionedColumns.get(node.id) ?? 0), 0) + 1;
    const maxRow =
      Math.max(...zoneNodes.map(node => positionedRows.get(node.id) ?? 0), 0) + 1;
    const zoneWidth = Math.max(
      minZoneWidth,
      zonePaddingX * 2 + maxColumn * nodeWidth + Math.max(0, maxColumn - 1) * nodeGapX,
    );
    const zoneHeight = Math.max(
      minZoneHeight,
      zoneHeaderHeight +
        zonePaddingTop +
        zonePaddingBottom +
        maxRow * nodeHeight +
        Math.max(0, maxRow - 1) * nodeGapY,
    );

    zoneLayoutMetrics.set(zoneId, {
      rows: maxRow,
      columns: maxColumn,
      width: zoneWidth,
      height: zoneHeight,
      x: currentZoneX,
    });

    currentZoneX += zoneWidth + zoneGap;
  }

  const zoneContentY = zoneStartY + zoneHeaderHeight + zonePaddingTop;
  const flowNodes: Node[] = zoneOrder.map(zoneId => {
    const zone = model.zones.find(candidate => candidate.id === zoneId)!;
    const zoneMetrics = zoneLayoutMetrics.get(zoneId)!;

    return {
      id: `zone:${zoneId}`,
      type: 'zone',
      position: {
        x: zoneMetrics.x,
        y: zoneStartY,
      },
      draggable: false,
      selectable: false,
      style: {
        width: zoneMetrics.width,
        height: zoneMetrics.height,
        border: 'none',
        background: 'transparent',
      },
      data: { zone },
      zIndex: 0,
    };
  });

  const ingressNode = model.nodes.find(node => node.kind === 'ingress');
  if (ingressNode) {
    const publicZoneId =
      zoneOrder.find(zoneId => zoneId === 'public') ?? zoneOrder[0];
    const publicZoneMetrics = publicZoneId
      ? zoneLayoutMetrics.get(publicZoneId)
      : undefined;
    const ingressY = publicZoneMetrics
      ? zoneStartY + zoneHeaderHeight + zonePaddingTop
      : defaultIngressY;

    flowNodes.push({
      id: ingressNode.id,
      type: 'service',
      position: { x: ingressX, y: ingressY },
      draggable: false,
      selectable: true,
      selected: ingressNode.id === selectedNodeId,
      data: { node: ingressNode },
      style: {
        width: nodeWidth,
      },
      zIndex: 2,
    });
  }

  for (const zoneId of zoneOrder) {
    const zoneNodes = nodesByZone.get(zoneId) ?? [];
    const zoneMetrics = zoneLayoutMetrics.get(zoneId)!;

    zoneNodes.forEach(node => {
      const column = positionedColumns.get(node.id) ?? 0;
      const row = positionedRows.get(node.id) ?? 0;

      flowNodes.push({
        id: node.id,
        type: 'service',
        position: {
          x: zoneMetrics.x + zonePaddingX + column * (nodeWidth + nodeGapX),
          y: zoneContentY + row * (nodeHeight + nodeGapY),
        },
        draggable: false,
        selectable: true,
        selected: node.id === selectedNodeId,
        data: { node },
        style: {
          width: nodeWidth,
        },
        zIndex: 2,
      });
    });
  }

  const flowEdges: Edge[] = model.edges.map(edge => {
    const color = edgeColor(edge.tone);

    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      animated: edge.animated,
      label: edge.label,
      type: 'smoothstep',
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color,
        width: 20,
        height: 20,
      },
      style: {
        stroke: color,
        strokeWidth: edge.tone === 'dependency' ? 2 : 2.5,
      },
      labelStyle: {
        fill: '#0f172a',
        fontSize: 11,
        fontWeight: 700,
      },
      labelBgStyle: {
        fill: 'rgba(255, 255, 255, 0.92)',
        fillOpacity: 1,
      },
      data: {
        tone: edge.tone,
      },
      zIndex: 1,
    };
  });

  return {
    nodes: flowNodes,
    edges: flowEdges,
  };
}

function getSelectedNodeSummary(
  model: ProjectServiceMapModel,
  selectedNodeId?: string,
) {
  if (!selectedNodeId) {
    return undefined;
  }

  const node = model.nodes.find(candidate => candidate.id === selectedNodeId);
  if (!node) {
    return undefined;
  }

  const incoming = model.edges.filter(edge => edge.target === selectedNodeId);
  const outgoing = model.edges.filter(edge => edge.source === selectedNodeId);
  const zone =
    model.zones.find(candidate => candidate.id === node.zone)?.title ?? node.zone;

  return {
    node,
    zone,
    incomingCount: incoming.length,
    outgoingCount: outgoing.length,
  };
}

export function ProjectServiceMap() {
  const classes = useStyles();
  const { entity } = useEntity();
  const catalogApi = useApi(catalogApiRef);
  const [model, setModel] = useState<ProjectServiceMapModel | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>();
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(undefined);

      try {
        const response = await catalogApi.getEntities({
          filter: getProjectComponentFilter(entity as Entity),
        });

        if (cancelled) {
          return;
        }

        const nextModel = buildProjectServiceMapModel(entity as Entity, response.items);
        setModel(nextModel);
        setSelectedNodeId(
          nextModel.nodes.find(node => node.kind === 'component')?.id ??
            nextModel.nodes[0]?.id,
        );
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError
            : new Error('Failed to load project components from the catalog'),
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [catalogApi, entity]);

  if (loading) {
    return (
      <div className={classes.wrapper}>
        <div className={classes.loading}>
          <CircularProgress />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card variant="outlined" className={classes.error}>
        <CardContent>
          <Typography variant="h6">Service map could not be loaded</Typography>
          <Typography color="textSecondary">{error.message}</Typography>
        </CardContent>
      </Card>
    );
  }

  if (!model || model.nodes.length <= 1) {
    return (
      <Card variant="outlined">
        <CardContent className={classes.empty}>
          <Typography variant="h6">No mapped components found</Typography>
          <Typography color="textSecondary">
            Add `kabang.cloud/project` annotations to project components to
            render a traffic map.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const flow = buildFlow(model, selectedNodeId);
  const selectedSummary = getSelectedNodeSummary(model, selectedNodeId);
  const handleNodeClick: NodeMouseHandler = (_event, node) => {
    setSelectedNodeId(node.id);
  };

  return (
    <div className={classes.wrapper}>
      <div className={classes.canvas}>
        <ReactFlow
          nodes={flow.nodes}
          edges={flow.edges}
          fitView
          fitViewOptions={{ padding: 0.12 }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable
          onNodeClick={handleNodeClick}
          onPaneClick={() => setSelectedNodeId(undefined)}
          zoomOnDoubleClick={false}
          nodeTypes={{
            service: ServiceNodeCard,
            zone: ZoneNode,
          }}
        >
          <Background gap={28} size={1.2} color="rgba(148, 163, 184, 0.22)" />
          <Controls showInteractive={false} />
          <Panel position="top-right">
            <Card elevation={0} className={classes.legend}>
              <Typography variant="subtitle2" className={classes.legendTitle}>
                Traffic Legend
              </Typography>
              <Divider style={{ background: 'rgba(15, 23, 42, 0.14)' }} />
              <div className={classes.legendRow}>
                <span
                  className={classes.legendSwatch}
                  style={{ background: '#0284c7' }}
                />
                <Typography variant="body2" className={classes.legendText}>
                  Public ingress
                </Typography>
              </div>
              <div className={classes.legendRow}>
                <span
                  className={classes.legendSwatch}
                  style={{ background: '#2563eb' }}
                />
                <Typography variant="body2" className={classes.legendText}>
                  Service-to-service traffic
                </Typography>
              </div>
              <div className={classes.legendRow}>
                <span
                  className={classes.legendSwatch}
                  style={{ background: '#ea580c' }}
                />
                <Typography variant="body2" className={classes.legendText}>
                  Dependency outside the project
                </Typography>
              </div>
            </Card>
          </Panel>
          <Panel position="bottom-right">
            <Card elevation={0} className={classes.inspector}>
              {selectedSummary ? (
                <CardContent>
                  <Typography variant="subtitle1" className={classes.inspectorTitle}>
                    {selectedSummary.node.title}
                  </Typography>
                  {selectedSummary.node.subtitle && (
                    <Typography
                      variant="body2"
                      className={classes.inspectorSubtitle}
                    >
                      {selectedSummary.node.subtitle}
                    </Typography>
                  )}
                  <div className={classes.inspectorRow}>
                    <Typography className={classes.inspectorLabel}>Zone</Typography>
                    <Typography className={classes.inspectorValue}>
                      {selectedSummary.zone}
                    </Typography>
                  </div>
                  <div className={classes.inspectorRow}>
                    <Typography className={classes.inspectorLabel}>
                      Incoming
                    </Typography>
                    <Typography className={classes.inspectorValue}>
                      {selectedSummary.incomingCount}
                    </Typography>
                  </div>
                  <div className={classes.inspectorRow}>
                    <Typography className={classes.inspectorLabel}>
                      Outgoing
                    </Typography>
                    <Typography className={classes.inspectorValue}>
                      {selectedSummary.outgoingCount}
                    </Typography>
                  </div>
                  <div className={classes.inspectorRow}>
                    <Typography className={classes.inspectorLabel}>Entity</Typography>
                    <Typography className={classes.inspectorValue}>
                      {selectedSummary.node.componentKind === 'component' &&
                      selectedSummary.node.entityRef ? (
                        <EntityRefLink entityRef={selectedSummary.node.entityRef} />
                      ) : (
                        selectedSummary.node.entityRef ?? selectedSummary.node.id
                      )}
                    </Typography>
                  </div>
                </CardContent>
              ) : (
                <CardContent>
                  <Typography variant="subtitle1" className={classes.inspectorTitle}>
                    Select a component
                  </Typography>
                  <Typography variant="body2" className={classes.inspectorHint}>
                    Click a node to inspect its zone, flow count, and linked
                    entity.
                  </Typography>
                </CardContent>
              )}
            </Card>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
}
