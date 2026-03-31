import { useEffect, useState } from 'react';
import { Card, CardContent, Chip, makeStyles, Typography } from '@material-ui/core';
import { InfoCard, Table, type TableColumn } from '@backstage/core-components';
import OpenInNewIcon from '@material-ui/icons/OpenInNew';
import {
  parseEntityRef,
} from '@backstage/catalog-model';
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  type Edge,
  type Node,
  type NodeMouseHandler,
  type NodeProps,
  Position,
  ReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  type ProjectServiceMapModel,
  type ServiceMapNode,
  type ServiceMapZone,
} from './ProjectServiceMap.model';
import {
  getDefaultSelectedNodeId,
  getSelectedNodeSummary,
  getVisibleNodeRows,
  type ServiceMapVisibleNodeRow,
} from './ProjectServiceMap.view-model';

const useStyles = makeStyles(theme => ({
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(3),
  },
  wrapper: {
    minHeight: 700,
    borderRadius: 16,
    overflow: 'hidden',
    display: 'flex',
    background:
      'radial-gradient(circle at top left, rgba(33, 150, 243, 0.08), transparent 32%), linear-gradient(180deg, #f8fbff 0%, #f4f7fb 100%)',
  },
  canvas: {
    flex: 1,
    height: 700,
    minWidth: 0,
  },
  canvasLane: {
    width: 360,
    minWidth: 360,
    height: 700,
    padding: theme.spacing(2),
    boxSizing: 'border-box',
    borderLeft: '1px solid rgba(148, 163, 184, 0.2)',
    background:
      theme.palette.type === 'dark'
        ? 'rgba(15, 23, 42, 0.4)'
        : 'linear-gradient(180deg, rgba(255, 255, 255, 0.74) 0%, rgba(248, 250, 252, 0.96) 100%)',
  },
  loading: {
    height: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeCard: {
    width: '100%',
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
  nodeCardDns: {
    background: 'linear-gradient(180deg, #ffffff 0%, #eef6ff 100%)',
    borderColor: 'rgba(37, 99, 235, 0.4)',
    boxShadow: '0 14px 28px rgba(37, 99, 235, 0.1)',
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
    border: '1px solid rgba(148, 163, 184, 0.34)',
    background: 'rgba(255, 255, 255, 0.82)',
    backdropFilter: 'blur(3px)',
    padding: theme.spacing(2.5),
    boxSizing: 'border-box',
  },
  zoneHeader: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: theme.spacing(1),
    position: 'relative',
    zIndex: 1,
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
  zoneGroupCard: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
    border: '1px dashed rgba(37, 99, 235, 0.3)',
    background:
      'linear-gradient(180deg, rgba(219, 234, 254, 0.44) 0%, rgba(239, 246, 255, 0.72) 100%)',
    padding: theme.spacing(2.5, 3),
    boxSizing: 'border-box',
  },
  zoneGroupTitle: {
    fontSize: '0.84rem',
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#1d4ed8',
    marginBottom: theme.spacing(0.75),
  },
  zoneGroupDescription: {
    fontSize: '0.78rem',
    color: 'rgba(30, 64, 175, 0.82)',
    maxWidth: 420,
  },
  selectedLane: {
    height: '100%',
    borderRadius: 16,
    border: `1px solid ${theme.palette.divider}`,
    background: theme.palette.background.paper,
    boxShadow:
      theme.palette.type === 'dark'
        ? '0 12px 28px rgba(0, 0, 0, 0.32)'
        : '0 12px 28px rgba(15, 23, 42, 0.08)',
    padding: theme.spacing(2),
  },
  selectedHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing(2),
  },
  empty: {
    padding: theme.spacing(6),
    textAlign: 'center',
  },
  error: {
    padding: theme.spacing(4),
  },
  inspector: {
    height: '100%',
  },
  selectedGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2.5),
  },
  selectedPrimary: {
    minWidth: 0,
  },
  selectedSection: {
    marginTop: theme.spacing(2),
  },
  selectedSectionTitle: {
    color: theme.palette.text.primary,
    fontWeight: 800,
    fontSize: '0.85rem',
    marginBottom: theme.spacing(1),
  },
  selectedSectionHint: {
    color: theme.palette.text.secondary,
    fontSize: '0.8rem',
    marginBottom: theme.spacing(1.5),
  },
  inspectorTitle: {
    fontWeight: 800,
    marginBottom: theme.spacing(0.5),
    color: theme.palette.text.primary,
  },
  inspectorSubtitle: {
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(1.5),
  },
  inspectorRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: theme.spacing(2),
    marginTop: theme.spacing(1),
  },
  inspectorLabel: {
    color: theme.palette.text.secondary,
    fontSize: '0.78rem',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontWeight: 700,
  },
  inspectorValue: {
    fontWeight: 700,
    textAlign: 'right',
    color: theme.palette.text.primary,
  },
  inspectorHint: {
    color: theme.palette.text.secondary,
    fontWeight: 500,
  },
  entityLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
    color: theme.palette.primary.main,
    fontWeight: 700,
    textDecoration: 'none',
  },
  entityLinkIcon: {
    fontSize: '0.95rem',
  },
  rowButton: {
    cursor: 'pointer',
  },
  rowSelected: {
    background: 'rgba(37, 99, 235, 0.08)',
  },
  cellTitle: {
    fontWeight: 700,
    color: theme.palette.text.primary,
  },
  cellSubtle: {
    color: theme.palette.text.secondary,
  },
  chipCompact: {
    fontSize: '0.68rem',
    fontWeight: 700,
  },
  resourceDiagram: {
    marginTop: theme.spacing(2),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing(1),
  },
  resourceNode: {
    borderRadius: 12,
    border: `1px solid ${theme.palette.divider}`,
    background:
      theme.palette.type === 'dark'
        ? 'rgba(255, 255, 255, 0.04)'
        : '#ffffff',
    padding: theme.spacing(1.25),
    minWidth: 170,
    maxWidth: 220,
    width: '100%',
    textAlign: 'center',
  },
  resourceNodeTitle: {
    color: theme.palette.text.primary,
    fontWeight: 700,
    fontSize: '0.85rem',
  },
  resourceNodeSubtitle: {
    color: theme.palette.text.secondary,
    fontSize: '0.78rem',
    marginTop: theme.spacing(0.5),
  },
  resourceArrow: {
    color: theme.palette.primary.main,
    fontWeight: 800,
    fontSize: '1.1rem',
    lineHeight: 1,
    padding: theme.spacing(0.25, 0),
  },
}));

type FlowNodeData = {
  node: ServiceMapNode;
};

type ZoneNodeData = {
  zone: ServiceMapZone;
};

type ZoneGroupNodeData = {
  title: string;
  description: string;
};

function hiddenHandleStyle(accent: string) {
  return {
    background: accent,
    width: 10,
    height: 10,
    opacity: 0,
    pointerEvents: 'none' as const,
  };
}

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
  node: ServiceMapNode,
  selected: boolean,
): string {
  const toneClassName = (() => {
    if (node.lane === 'dns') {
      return classes.nodeCardDns;
    }

    switch (node.tone) {
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
  const cardClassName = getNodeCardClassName(classes, node, selected);

  return (
    <>
      {node.kind !== 'ingress' && (
        <>
          <Handle
            id="west"
            type="target"
            position={Position.Left}
            style={{ background: accent, width: 10, height: 10 }}
          />
          <Handle
            id="north"
            type="target"
            position={Position.Top}
            style={hiddenHandleStyle(accent)}
          />
        </>
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
        id="east"
        type="source"
        position={Position.Right}
        style={{ background: accent, width: 10, height: 10 }}
      />
      <Handle
        id="south"
        type="source"
        position={Position.Bottom}
        style={hiddenHandleStyle(accent)}
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

function ZoneGroupNode({ data }: NodeProps<Node<ZoneGroupNodeData>>) {
  const classes = useStyles();

  return (
    <div className={classes.zoneGroupCard}>
      <Typography className={classes.zoneGroupTitle}>{data.title}</Typography>
      <Typography className={classes.zoneGroupDescription}>
        {data.description}
      </Typography>
    </div>
  );
}

function resolveEdgeHandles(
  edge: {
    source: string;
    target: string;
  },
  nodeById: Map<string, ServiceMapNode>,
) {
  const sourceNode = nodeById.get(edge.source);
  const targetNode = nodeById.get(edge.target);

  if (
    sourceNode?.kind === 'component' &&
    targetNode?.kind === 'component' &&
    targetNode.zone === 'intra' &&
    ['app', 'k8s'].includes(sourceNode.zone)
  ) {
    return {
      sourceHandle: 'south',
      targetHandle: 'north',
    };
  }

  return {
    sourceHandle: 'east',
    targetHandle: 'west',
  };
}

function getEntityHref(entityRef: string): string {
  const parsed = parseEntityRef(entityRef);

  return `/catalog/${parsed.namespace ?? 'default'}/${parsed.kind.toLocaleLowerCase(
    'en-US',
  )}/${parsed.name}`;
}

function EntityLinkWithIcon({
  entityRef,
  label,
}: {
  entityRef: string;
  label?: string;
}) {
  const classes = useStyles();

  return (
    <a
      href={getEntityHref(entityRef)}
      target="_blank"
      rel="noreferrer"
      className={classes.entityLink}
    >
      <span>{label ?? entityRef}</span>
      <OpenInNewIcon className={classes.entityLinkIcon} />
    </a>
  );
}

export function buildFlow(
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
  const nodeGapY = 44;
  const minZoneWidth = 360;
  const minZoneHeight = 248;
  const zoneGap = 72;
  const zoneStartX = 160;
  const zoneStartY = 80;
  const zoneHeaderHeight = 72;
  const zonePaddingLeft = 40;
  const zonePaddingRight = 40;
  const zonePaddingTop = 28;
  const zonePaddingBottom = 36;
  const privateGroupColumnGap = 40;
  const privateGroupRowGap = 56;
  const ingressGap = 64;
  const ingressX = zoneStartX - nodeWidth - ingressGap;
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

      let nextColumn = 0;
      if (sourceNode.kind === 'component' && sourceNode.zone === targetNode.zone) {
        nextColumn = (localColumnByNode.get(sourceNode.id) ?? 0) + 1;
      }

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
      y: number;
    }
  >();
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
    const zoneColumnValues = zoneNodes.map(node => localColumnByNode.get(node.id) ?? 0);
    const minColumn = zoneColumnValues.length > 0 ? Math.min(...zoneColumnValues) : 0;
    const provisionalRows = new Map<string, number>();

    for (const node of zoneNodes) {
      const column = (localColumnByNode.get(node.id) ?? 0) - minColumn;
      const preferredRow = preferredRowByNode.get(node.id) ?? 0;
      const occupiedRows = occupiedRowsByColumn.get(column) ?? new Set<number>();
      let row = preferredRow;

      while (occupiedRows.has(row)) {
        row += 1;
      }

      occupiedRows.add(row);
      occupiedRowsByColumn.set(column, occupiedRows);
      positionedColumns.set(node.id, column);
      provisionalRows.set(node.id, row);
    }

    const minRow =
      provisionalRows.size > 0 ? Math.min(...provisionalRows.values()) : 0;

    for (const node of zoneNodes) {
      const normalizedRow = (provisionalRows.get(node.id) ?? 0) - minRow;
      positionedRows.set(node.id, normalizedRow);
    }

    const maxColumn =
      Math.max(...zoneNodes.map(node => positionedColumns.get(node.id) ?? 0), 0) + 1;
    const maxRow =
      Math.max(...zoneNodes.map(node => positionedRows.get(node.id) ?? 0), 0) + 1;
    const zoneWidth = Math.max(
      minZoneWidth,
      zonePaddingLeft +
        zonePaddingRight +
        maxColumn * nodeWidth +
        Math.max(0, maxColumn - 1) * nodeGapX,
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
      x: 0,
      y: zoneStartY,
    });
  }

  const customPrivateZoneIds = zoneOrder.filter(
    zoneId => !['public', 'private'].includes(zoneId),
  );
  const groupedZoneColumns = [
    ['app', 'k8s'],
    ['db', 'intra'],
  ]
    .map(zoneIds => zoneIds.filter(zoneId => customPrivateZoneIds.includes(zoneId)))
    .filter(zoneIds => zoneIds.length > 0);
  const groupedZoneIds = new Set(groupedZoneColumns.flat());
  const remainingCustomZoneIds = customPrivateZoneIds.filter(
    zoneId => !groupedZoneIds.has(zoneId),
  );
  const flowNodes: Node[] = [];

  if (groupedZoneColumns.length > 0) {
    const publicZoneMetrics = zoneLayoutMetrics.get('public');

    let currentZoneX = zoneStartX;
    if (publicZoneMetrics) {
      zoneLayoutMetrics.set('public', {
        ...publicZoneMetrics,
        x: currentZoneX,
        y: zoneStartY,
      });
      currentZoneX += publicZoneMetrics.width + zoneGap;
    }

    for (const columnZoneIds of groupedZoneColumns) {
      const columnWidth = Math.max(
        ...columnZoneIds.map(
          zoneId => zoneLayoutMetrics.get(zoneId)?.width ?? minZoneWidth,
        ),
      );
      let currentZoneY = zoneStartY;

      for (const zoneId of columnZoneIds) {
        const metrics = zoneLayoutMetrics.get(zoneId)!;
        zoneLayoutMetrics.set(zoneId, {
          ...metrics,
          width: columnWidth,
          x: currentZoneX,
          y: currentZoneY,
        });
        currentZoneY += metrics.height + privateGroupRowGap;
      }

      currentZoneX += columnWidth + privateGroupColumnGap;
    }

    for (const zoneId of remainingCustomZoneIds) {
      const metrics = zoneLayoutMetrics.get(zoneId)!;
      zoneLayoutMetrics.set(zoneId, {
        ...metrics,
        x: currentZoneX,
        y: zoneStartY,
      });
      currentZoneX += metrics.width + zoneGap;
    }
  } else {
    let currentZoneX = zoneStartX;
    for (const zoneId of zoneOrder) {
      const metrics = zoneLayoutMetrics.get(zoneId)!;
      zoneLayoutMetrics.set(zoneId, {
        ...metrics,
        x: currentZoneX,
        y: zoneStartY,
      });
      currentZoneX += metrics.width + zoneGap;
    }
  }

  flowNodes.push(
    ...zoneOrder.map(zoneId => {
      const zone = model.zones.find(candidate => candidate.id === zoneId)!;
      const zoneMetrics = zoneLayoutMetrics.get(zoneId)!;

      return {
        id: `zone:${zoneId}`,
        type: 'zone',
        position: {
          x: zoneMetrics.x,
          y: zoneMetrics.y,
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
    }),
  );

  const ingressNode = model.nodes.find(node => node.kind === 'ingress');
  if (ingressNode) {
    const publicZoneId =
      zoneOrder.find(zoneId => zoneId === 'public') ?? zoneOrder[0];
    const publicZoneMetrics = publicZoneId
      ? zoneLayoutMetrics.get(publicZoneId)
      : undefined;
    const ingressY = publicZoneMetrics
      ? publicZoneMetrics.y + zoneHeaderHeight + zonePaddingTop
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
    const zoneContentY = zoneMetrics.y + zoneHeaderHeight + zonePaddingTop;

    zoneNodes.forEach(node => {
      const column = positionedColumns.get(node.id) ?? 0;
      const row = positionedRows.get(node.id) ?? 0;

      flowNodes.push({
        id: node.id,
        type: 'service',
        position: {
          x: zoneMetrics.x + zonePaddingLeft + column * (nodeWidth + nodeGapX),
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
    const handles = resolveEdgeHandles(edge, nodeById);

    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: handles.sourceHandle,
      targetHandle: handles.targetHandle,
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
        fill: '#1f2937',
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

export function ProjectServiceMap({
  model,
  inventoryOnly = false,
}: {
  model: ProjectServiceMapModel;
  inventoryOnly?: boolean;
}) {
  const classes = useStyles();
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
            edge stacks to render a traffic map.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const flow = buildFlow(model, selectedNodeId);
  const selectedSummary = getSelectedNodeSummary(model, selectedNodeId);
  const visibleNodeRows = getVisibleNodeRows(model);
  const inventoryColumns: TableColumn<ServiceMapVisibleNodeRow>[] = [
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
  const handleNodeClick: NodeMouseHandler = (_event, node) => {
    setSelectedNodeId(node.id);
  };
  const ownedResources = selectedSummary?.node.ownedResources ?? [];
  const hasOwnedResources = ownedResources.length > 0;

  if (inventoryOnly) {
    return (
      <InfoCard
        title="Service Map Inventory"
        subheader="Nodes currently represented in the map, including shared edge stacks and project components."
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
        title="Service Map"
        subheader="Traffic-oriented topology for the current project, including domain-record entry points, shared edge stacks, and downstream components."
      >
        <div className={classes.wrapper}>
          <div className={classes.canvas}>
            <ReactFlow
              nodes={flow.nodes}
              edges={flow.edges}
              fitView
              fitViewOptions={{ padding: 0.04 }}
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable
              onNodeClick={handleNodeClick}
              onPaneClick={() => setSelectedNodeId(undefined)}
              zoomOnDoubleClick={false}
              nodeTypes={{
                service: ServiceNodeCard,
                zone: ZoneNode,
                zoneGroup: ZoneGroupNode,
              }}
            >
              <Background gap={28} size={1.2} color="rgba(148, 163, 184, 0.22)" />
              <Controls showInteractive={false} />
            </ReactFlow>
          </div>
          <div className={classes.canvasLane}>
            <div className={classes.selectedLane}>
              <div className={classes.selectedGrid}>
                <div className={classes.selectedPrimary}>
                  <div className={classes.inspector}>
                    {selectedSummary ? (
                      <>
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
                          <Typography className={classes.inspectorLabel}>Incoming</Typography>
                          <Typography className={classes.inspectorValue}>
                            {selectedSummary.incomingCount}
                          </Typography>
                        </div>
                        <div className={classes.inspectorRow}>
                          <Typography className={classes.inspectorLabel}>Outgoing</Typography>
                          <Typography className={classes.inspectorValue}>
                            {selectedSummary.outgoingCount}
                          </Typography>
                        </div>
                        <div className={classes.inspectorRow}>
                          <Typography className={classes.inspectorLabel}>Exposure</Typography>
                          <Typography className={classes.inspectorValue}>
                            {selectedSummary.node.exposure}
                          </Typography>
                        </div>
                        <div className={classes.inspectorRow}>
                          <Typography className={classes.inspectorLabel}>Entity</Typography>
                          <Typography className={classes.inspectorValue}>
                            {selectedSummary.node.componentKind === 'component' &&
                            selectedSummary.node.entityRef ? (
                              <EntityLinkWithIcon
                                entityRef={selectedSummary.node.entityRef}
                                label={selectedSummary.node.title}
                              />
                            ) : (
                              selectedSummary.node.entityRef ?? selectedSummary.node.id
                            )}
                          </Typography>
                        </div>
                      </>
                    ) : (
                      <>
                        <Typography variant="subtitle1" className={classes.inspectorTitle}>
                          Select a component
                        </Typography>
                        <Typography variant="body2" className={classes.inspectorHint}>
                          Click a node in the service map to inspect its traffic and
                          catalog information here.
                        </Typography>
                      </>
                    )}
                  </div>
                </div>

                {hasOwnedResources ? (
                  <div className={classes.selectedSection}>
                    <Typography className={classes.selectedSectionTitle}>
                      Topology Details
                    </Typography>
                    <Typography className={classes.selectedSectionHint}>
                      Ordered owned resources shown as a top-to-bottom chain for
                      the selected node.
                    </Typography>
                    <div className={classes.resourceDiagram}>
                      {ownedResources.flatMap((resource, index) => [
                        <div
                          key={`${resource.id}:diagram`}
                          className={classes.resourceNode}
                        >
                          {resource.entityRef ? (
                            <EntityLinkWithIcon
                              entityRef={resource.entityRef}
                              label={resource.title}
                            />
                          ) : (
                            <Typography className={classes.resourceNodeTitle}>
                              {resource.title}
                            </Typography>
                          )}
                          <Typography className={classes.resourceNodeSubtitle}>
                            {resource.subtitle}
                          </Typography>
                        </div>,
                        index < ownedResources.length - 1 ? (
                          <span
                            key={`${resource.id}:arrow`}
                            className={classes.resourceArrow}
                          >
                            ↓
                          </span>
                        ) : null,
                      ])}
                    </div>
                  </div>
                ) : null}

                {!hasOwnedResources ? (
                  <Typography variant="body2" className={classes.inspectorHint}>
                    No additional topology metadata is mapped for the current
                    selection.
                  </Typography>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </InfoCard>
    </div>
  );
}
