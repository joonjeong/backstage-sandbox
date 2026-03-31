import type {
  ProjectServiceMapModel,
  ServiceMapNode,
} from './ProjectServiceMap.model';

export type ServiceMapSelectedNodeSummary = {
  node: ServiceMapNode;
  zone: string;
  incomingCount: number;
  outgoingCount: number;
};

export type ServiceMapVisibleNodeRow = {
  id: string;
  title: string;
  subtitle?: string;
  zone: string;
  exposure: 'public' | 'private';
  incomingCount: number;
  outgoingCount: number;
  entityRef?: string;
  componentKind?: ServiceMapNode['componentKind'];
};

export function getDefaultSelectedNodeId(
  model: ProjectServiceMapModel,
): string | undefined {
  return (
    model.nodes.find(node => node.entityRole === 'edge-stack')?.id ??
    model.nodes.find(node => node.kind === 'component')?.id ??
    model.nodes[0]?.id
  );
}

export function getSelectedNodeSummary(
  model: ProjectServiceMapModel,
  selectedNodeId?: string,
): ServiceMapSelectedNodeSummary | undefined {
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
    model.zones.find(candidate => candidate.id === node.zone)?.title ??
    node.zone;

  return {
    node,
    zone,
    incomingCount: incoming.length,
    outgoingCount: outgoing.length,
  };
}

export function getVisibleNodeRows(
  model: ProjectServiceMapModel,
): ServiceMapVisibleNodeRow[] {
  return model.nodes
    .filter(node => node.kind === 'component')
    .map(node => {
      const incomingCount = model.edges.filter(
        edge => edge.target === node.id,
      ).length;
      const outgoingCount = model.edges.filter(
        edge => edge.source === node.id,
      ).length;
      const zone =
        model.zones.find(candidate => candidate.id === node.zone)?.title ??
        node.zone;

      return {
        id: node.id,
        title: node.title,
        subtitle: node.subtitle,
        zone,
        exposure: node.exposure ?? 'private',
        incomingCount,
        outgoingCount,
        entityRef: node.entityRef,
        componentKind: node.componentKind,
      };
    });
}
