import type { Entity } from '@backstage/catalog-model';
import { buildFlow } from '../components/TopologyCanvas';
import { buildTopologyModel } from './Topology.model';

function createEdgeSystem({
  name,
  title,
  projectRef,
  pattern = 'tls-mtls-gateway',
  network,
  attachments,
  hops,
  relations,
}: {
  name: string;
  title?: string;
  projectRef?: string;
  pattern?: string;
  network?: Record<string, unknown>;
  attachments?: Array<Record<string, unknown>>;
  hops?: Array<Record<string, unknown>>;
  relations?: Array<Record<string, unknown>>;
}): Entity {
  return {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'System',
    metadata: {
      namespace: 'default',
      name,
      ...(title ? { title } : {}),
      annotations: {
        'kabang.cloud/system-role': 'edge-stack',
        ...(projectRef ? { 'kabang.cloud/project': projectRef } : {}),
      },
    },
    spec: {
      owner: 'group:default/platform',
      type: 'edge-stack',
      lifecycle: 'production',
      'x-edgestack': {
        team: 'group:default/platform',
        pattern,
        ...(network ? { network } : {}),
        ...(attachments ? { attachments } : {}),
        ...(hops ? { hops } : {}),
      },
    },
    relations: relations as Entity['relations'],
  } as Entity;
}

describe('buildTopologyModel', () => {
  it('builds public ingress and service traffic edges from catalog data', () => {
    const project = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Domain',
      metadata: {
        namespace: 'default',
        name: 'guest-portal',
        title: 'Guest Portal',
      },
      spec: {
        owner: 'user:default/jane',
        team: 'group:default/guests',
      },
    } as Entity;

    const web = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        namespace: 'default',
        name: 'guest-portal-web',
        annotations: {
          'kabang.cloud/project': 'domain:default/guest-portal',
        },
      },
      spec: {
        type: 'website',
        lifecycle: 'production',
      },
      relations: [
        {
          type: 'dependsOn',
          targetRef: 'component:default/guest-portal-api',
        },
      ],
    } as Entity;

    const api = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        namespace: 'default',
        name: 'guest-portal-api',
        annotations: {
          'kabang.cloud/project': 'domain:default/guest-portal',
          'kabang.cloud/service-zone': 'private',
        },
      },
      spec: {
        type: 'service',
        lifecycle: 'production',
      },
      relations: [],
    } as Entity;

    const model = buildTopologyModel(project, [web, api]);

    expect(model.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'public-traffic',
          kind: 'ingress',
        }),
        expect.objectContaining({
          id: 'component:default/guest-portal-web',
          zone: 'public',
        }),
        expect.objectContaining({
          id: 'component:default/guest-portal-api',
          zone: 'private',
        }),
      ]),
    );

    expect(model.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'public-traffic',
          target: 'component:default/guest-portal-web',
          label: 'ingress',
        }),
        expect.objectContaining({
          source: 'component:default/guest-portal-web',
          target: 'component:default/guest-portal-api',
          label: 'routes traffic',
        }),
      ]),
    );
  });

  it('includes edge stacks as traffic entry nodes for project components', () => {
    const project = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Domain',
      metadata: {
        namespace: 'default',
        name: 'guest-portal',
        title: 'Guest Portal',
      },
      spec: {
        owner: 'user:default/jane',
        team: 'group:default/guests',
      },
    } as Entity;

    const edgeStack = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'System',
      metadata: {
        namespace: 'default',
        name: 'public-web-entry-prod',
        title: 'TLS/mTLS Gateway',
        annotations: {
          'kabang.cloud/project': 'domain:default/guest-portal',
          'kabang.cloud/system-role': 'edge-stack',
        },
      },
      spec: {
        owner: 'group:default/platform',
        type: 'edge-stack',
        lifecycle: 'production',
        'x-edgestack': {
          team: 'group:default/platform',
          pattern: 'tls-mtls-gateway',
          network: {
            ingressSubnet: 'public',
          },
        },
      },
      relations: [
        {
          type: 'routesTrafficTo',
          targetRef: 'component:default/guest-portal-web',
        },
      ],
    } as Entity;

    const web = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        namespace: 'default',
        name: 'guest-portal-web',
        annotations: {
          'kabang.cloud/project': 'domain:default/guest-portal',
        },
      },
      spec: {
        type: 'website',
        lifecycle: 'production',
      },
      relations: [],
    } as Entity;

    const model = buildTopologyModel(project, [edgeStack, web]);

    expect(model.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'system:default/public-web-entry-prod',
          zone: 'public',
        }),
      ]),
    );

    expect(model.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'public-traffic',
          target: 'system:default/public-web-entry-prod',
          label: 'ingress',
        }),
        expect.objectContaining({
          source: 'system:default/public-web-entry-prod',
          target: 'component:default/guest-portal-web',
          label: 'routes traffic',
        }),
      ]),
    );
  });

  it('models public ingress as a domain record and keeps hosted zones as metadata', () => {
    const project = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Domain',
      metadata: {
        namespace: 'default',
        name: 'guest-portal',
        title: 'Guest Portal',
      },
      spec: {
        owner: 'user:default/jane',
        team: 'group:default/guests',
      },
    } as Entity;

    const edgeStack = createEdgeSystem({
      name: 'shared-public-web-entry',
      title: 'TLS/mTLS Gateway',
      pattern: 'tls-mtls-gateway',
      network: {
        ingressSubnet: 'public',
      },
      attachments: [
        {
          kind: 'Route53',
          entityRef: 'resource:default/public-hosted-zone',
        },
      ],
      relations: [
        {
          type: 'partOf',
          targetRef: 'domain:default/guest-portal',
        },
        {
          type: 'routesTrafficTo',
          targetRef: 'component:default/guest-portal-web',
        },
      ],
    });

    const web = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        namespace: 'default',
        name: 'guest-portal-web',
        annotations: {
          'kabang.cloud/project': 'domain:default/guest-portal',
        },
      },
      spec: {
        type: 'website',
        lifecycle: 'production',
      },
      relations: [],
    } as Entity;

    const model = buildTopologyModel(project, [edgeStack, web]);
    const ingressNode = model.nodes.find(node => node.id === 'public-traffic');
    const edgeStackNode = model.nodes.find(
      node => node.id === 'system:default/shared-public-web-entry',
    );

    expect(ingressNode).toBeDefined();
    expect(edgeStackNode).toBeDefined();
    expect(model.nodes.some(node => node.id.includes(':dns:'))).toBe(false);
    expect(ingressNode).toEqual(
      expect.objectContaining({
        title: 'guest-portal',
        subtitle: 'Domain Record · Public Hosted Zone',
        details: expect.arrayContaining([
          expect.objectContaining({
            title: 'Public Hosted Zone',
            subtitle: 'hosted zone · Route53',
          }),
        ]),
      }),
    );
    expect(
      edgeStackNode?.ownedResources?.some(
        resource => resource.title === 'Public Hosted Zone',
      ) ?? false,
    ).toBe(false);
  });

  it('keeps subnet cards tightly wrapped around their nodes with balanced padding', () => {
    const project = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Domain',
      metadata: {
        namespace: 'default',
        name: 'guest-portal',
        title: 'Guest Portal',
      },
      spec: {
        owner: 'user:default/jane',
        team: 'group:default/guests',
      },
    } as Entity;

    const web = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        namespace: 'default',
        name: 'guest-portal-web',
        annotations: {
          'kabang.cloud/project': 'domain:default/guest-portal',
        },
      },
      spec: {
        type: 'website',
        lifecycle: 'production',
      },
      relations: [
        {
          type: 'dependsOn',
          targetRef: 'component:default/guest-portal-api',
        },
      ],
    } as Entity;

    const api = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        namespace: 'default',
        name: 'guest-portal-api',
        annotations: {
          'kabang.cloud/project': 'domain:default/guest-portal',
          'kabang.cloud/service-zone': 'private',
        },
      },
      spec: {
        type: 'service',
        lifecycle: 'production',
      },
      relations: [],
    } as Entity;

    const flow = buildFlow(buildTopologyModel(project, [web, api]));
    const publicZone = flow.nodes.find(node => node.id === 'zone:public');
    const privateZone = flow.nodes.find(node => node.id === 'zone:private');
    const publicServiceNode = flow.nodes.find(
      node => node.id === 'component:default/guest-portal-web',
    );
    const privateServiceNode = flow.nodes.find(
      node => node.id === 'component:default/guest-portal-api',
    );

    expect(publicZone).toBeDefined();
    expect(privateZone).toBeDefined();
    expect(publicServiceNode).toBeDefined();
    expect(privateServiceNode).toBeDefined();

    const publicZoneWidth = Number(publicZone?.style?.width);
    const privateZoneWidth = Number(privateZone?.style?.width);
    const nodeWidth = Number(publicServiceNode?.style?.width);
    const publicLeftPadding =
      (publicServiceNode?.position.x ?? 0) - (publicZone?.position.x ?? 0);
    const publicRightPadding =
      (publicZone?.position.x ?? 0) +
      publicZoneWidth -
      ((publicServiceNode?.position.x ?? 0) + nodeWidth);
    const privateLeftPadding =
      (privateServiceNode?.position.x ?? 0) - (privateZone?.position.x ?? 0);
    const privateRightPadding =
      (privateZone?.position.x ?? 0) +
      privateZoneWidth -
      ((privateServiceNode?.position.x ?? 0) + nodeWidth);

    expect(publicLeftPadding).toBeGreaterThanOrEqual(32);
    expect(publicRightPadding).toBeGreaterThanOrEqual(32);
    expect(publicRightPadding).toBeLessThanOrEqual(80);
    expect(privateLeftPadding).toBeGreaterThanOrEqual(32);
    expect(privateLeftPadding).toBeLessThanOrEqual(80);
    expect(privateRightPadding).toBeGreaterThanOrEqual(32);
    expect(privateRightPadding).toBeLessThanOrEqual(80);
  });

  it('captures CloudFront and S3 runtime resources for static web components', () => {
    const project = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Domain',
      metadata: {
        namespace: 'default',
        name: 'guest-ops-console',
        title: 'Guest Ops Console',
      },
      spec: {
        owner: 'user:default/jane',
        team: 'group:default/guests',
      },
    } as Entity;

    const ui = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        namespace: 'default',
        name: 'guest-ops-console-ui',
        title: 'Guest Ops Console UI',
        annotations: {
          'kabang.cloud/project': 'domain:default/guest-ops-console',
        },
      },
      spec: {
        type: 'website',
        lifecycle: 'production',
        runtimeResources: [
          {
            role: 'cdn',
            kind: 'cloudfront',
            entityRef: 'resource:default/guest-ops-console-cdn',
            title: 'Guest Ops Console CDN',
          },
          {
            role: 'origin',
            kind: 's3',
            entityRef: 'resource:default/guest-ops-console-static-site',
            title: 'Guest Ops Console Static Site',
          },
        ],
      },
      relations: [],
    } as Entity;

    const model = buildTopologyModel(project, [ui]);
    const uiNode = model.nodes.find(
      node => node.id === 'component:default/guest-ops-console-ui',
    );

    expect(uiNode).toEqual(
      expect.objectContaining({
        title: 'Guest Ops Console UI',
        ownedResources: expect.arrayContaining([
          expect.objectContaining({
            title: 'Guest Ops Console CDN',
            subtitle: 'cdn · CloudFront',
          }),
          expect.objectContaining({
            title: 'Guest Ops Console Static Site',
            subtitle: 'origin · S3',
          }),
        ]),
      }),
    );
  });

  it('builds the app-webview topology across public, app, k8s, db, and intra subnets', () => {
    const project = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Domain',
      metadata: {
        namespace: 'default',
        name: 'app-webview',
        title: 'App Webview',
      },
      spec: {
        owner: 'user:default/jane',
        team: 'group:default/guests',
      },
    } as Entity;

    const gateway = createEdgeSystem({
      name: 'app-webview-tls-mtls-gateway',
      title: 'TLS/mTLS Gateway',
      pattern: 'tls-mtls-gateway',
      network: {
        ingressSubnet: 'public',
        upstreamSubnet: 'k8s',
      },
      attachments: [
        {
          kind: 'Route53',
          entityRef: 'resource:default/public-hosted-zone',
        },
      ],
      relations: [
        {
          type: 'partOf',
          targetRef: 'domain:default/app-webview',
        },
        {
          type: 'routesTrafficTo',
          targetRef: 'system:default/app-webview-k8s-ingress',
        },
      ],
    });

    const k8sIngress = createEdgeSystem({
      name: 'app-webview-k8s-ingress',
      title: 'K8s Ingress Tier',
      pattern: 'k8s-ingress',
      network: {
        ingressSubnet: 'k8s',
        upstreamSubnet: 'k8s',
      },
      relations: [
        {
          type: 'partOf',
          targetRef: 'domain:default/app-webview',
        },
        {
          type: 'routesTrafficTo',
          targetRef: 'component:default/app-webview-workload',
        },
      ],
    });

    const staticWebView = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        namespace: 'default',
        name: 'app-webview-static-web-view',
        title: 'Static Web View',
        annotations: {
          'kabang.cloud/project': 'domain:default/app-webview',
        },
      },
      spec: {
        type: 'website',
        lifecycle: 'production',
        runtimeResources: [
          {
            role: 'cdn',
            kind: 'cloudfront',
            entityRef: 'resource:default/app-webview-static-cdn',
          },
          {
            role: 'origin',
            kind: 's3',
            entityRef: 'resource:default/app-webview-static-site',
          },
        ],
      },
      relations: [],
    } as Entity;

    const workload = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        namespace: 'default',
        name: 'app-webview-workload',
        title: 'App Webview Workload',
        annotations: {
          'kabang.cloud/project': 'domain:default/app-webview',
          'kabang.cloud/service-zone': 'k8s',
        },
      },
      spec: {
        type: 'service',
        lifecycle: 'production',
      },
      relations: [],
    } as Entity;

    const redis = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        namespace: 'default',
        name: 'app-webview-redis',
        title: 'Redis Cache',
        annotations: {
          'kabang.cloud/project': 'domain:default/app-webview',
          'kabang.cloud/service-zone': 'app',
        },
      },
      spec: {
        type: 'redis',
        lifecycle: 'production',
      },
      relations: [],
    } as Entity;

    const mysql = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        namespace: 'default',
        name: 'app-webview-mysql',
        title: 'MySQL Database',
        annotations: {
          'kabang.cloud/project': 'domain:default/app-webview',
          'kabang.cloud/service-zone': 'db',
        },
      },
      spec: {
        type: 'database',
        lifecycle: 'production',
      },
      relations: [],
    } as Entity;

    const ldap = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        namespace: 'default',
        name: 'app-webview-ldap',
        title: 'LDAP Directory',
        annotations: {
          'kabang.cloud/project': 'domain:default/app-webview',
          'kabang.cloud/service-zone': 'intra',
        },
      },
      spec: {
        type: 'directory',
        lifecycle: 'production',
      },
      relations: [],
    } as Entity;

    const model = buildTopologyModel(project, [
      gateway,
      k8sIngress,
      staticWebView,
      workload,
      redis,
      mysql,
      ldap,
    ]);

    expect(model.zones).toEqual([
      expect.objectContaining({ id: 'public', title: 'Public Subnet' }),
      expect.objectContaining({ id: 'k8s', title: 'K8s Subnet' }),
      expect.objectContaining({ id: 'app', title: 'App Subnet' }),
      expect.objectContaining({ id: 'db', title: 'DB Subnet' }),
      expect.objectContaining({ id: 'intra', title: 'Intra Subnet' }),
    ]);

    expect(model.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'public-traffic',
          target: 'component:default/app-webview-static-web-view',
          label: 'ingress',
        }),
        expect.objectContaining({
          source: 'public-traffic',
          target: 'system:default/app-webview-tls-mtls-gateway',
          label: 'ingress',
        }),
        expect.objectContaining({
          source: 'system:default/app-webview-tls-mtls-gateway',
          target: 'system:default/app-webview-k8s-ingress',
          label: 'routes traffic',
        }),
        expect.objectContaining({
          source: 'system:default/app-webview-k8s-ingress',
          target: 'component:default/app-webview-workload',
          label: 'routes traffic',
        }),
      ]),
    );

    const staticNode = model.nodes.find(
      node => node.id === 'component:default/app-webview-static-web-view',
    );
    const mysqlNode = model.nodes.find(
      node => node.id === 'component:default/app-webview-mysql',
    );

    expect(staticNode?.ownedResources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ subtitle: 'cdn · CloudFront' }),
        expect.objectContaining({ subtitle: 'origin · S3' }),
      ]),
    );
    expect(mysqlNode?.zone).toBe('db');

    const flow = buildFlow(model);
    const publicZone = flow.nodes.find(node => node.id === 'zone:public');
    const appZone = flow.nodes.find(node => node.id === 'zone:app');
    const k8sZone = flow.nodes.find(node => node.id === 'zone:k8s');
    const dbZone = flow.nodes.find(node => node.id === 'zone:db');
    const intraZone = flow.nodes.find(node => node.id === 'zone:intra');

    expect(
      flow.nodes.find(node => node.id === 'zone-group:private'),
    ).toBeUndefined();
    expect(appZone?.position.x ?? 0).toBeGreaterThan(
      publicZone?.position.x ?? 0,
    );
    expect(appZone?.position.x).toBe(k8sZone?.position.x);
    expect(k8sZone?.position.y ?? 0).toBeGreaterThan(appZone?.position.y ?? 0);
    expect(dbZone?.position.x ?? 0).toBeGreaterThan(appZone?.position.x ?? 0);
    expect(dbZone?.position.x).toBe(intraZone?.position.x);
    expect(intraZone?.position.y ?? 0).toBeGreaterThan(dbZone?.position.y ?? 0);
    expect(appZone?.style?.width).toBe(k8sZone?.style?.width);
    expect(dbZone?.style?.width).toBe(intraZone?.style?.width);
    expect(
      flow.edges.some(
        edge =>
          edge.source === 'component:default/app-webview-workload' &&
          [
            'component:default/app-webview-redis',
            'component:default/app-webview-mysql',
            'component:default/app-webview-ldap',
          ].includes(edge.target),
      ),
    ).toBe(false);
  });

  it('groups direct-entry private subnets before intra and keeps intra last', () => {
    const project = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Domain',
      metadata: {
        namespace: 'default',
        name: 'networked-app',
      },
      spec: {
        owner: 'user:default/jane',
        team: 'group:default/guests',
      },
    } as Entity;

    const appWorkload = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        namespace: 'default',
        name: 'app-workload',
        annotations: {
          'kabang.cloud/project': 'domain:default/networked-app',
          'kabang.cloud/service-zone': 'app',
        },
      },
      spec: {
        type: 'service',
        lifecycle: 'production',
      },
      relations: [
        {
          type: 'dependsOn',
          targetRef: 'component:default/intra-ldap',
        },
      ],
    } as Entity;

    const k8sWorkload = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        namespace: 'default',
        name: 'k8s-workload',
        annotations: {
          'kabang.cloud/project': 'domain:default/networked-app',
          'kabang.cloud/service-zone': 'k8s',
          'kabang.cloud/traffic-targets': 'component:default/app-workload',
        },
      },
      spec: {
        type: 'service',
        lifecycle: 'production',
      },
      relations: [],
    } as Entity;

    const ingressToApp = createEdgeSystem({
      name: 'app-gateway',
      network: {
        ingressSubnet: 'public',
        upstreamSubnet: 'app',
      },
      relations: [
        {
          type: 'routesTrafficTo',
          targetRef: 'component:default/app-workload',
        },
      ],
    });

    const ingressToK8s = createEdgeSystem({
      name: 'k8s-gateway',
      network: {
        ingressSubnet: 'public',
        upstreamSubnet: 'k8s',
      },
      relations: [
        {
          type: 'routesTrafficTo',
          targetRef: 'component:default/k8s-workload',
        },
      ],
    });

    const intra = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        namespace: 'default',
        name: 'intra-ldap',
        annotations: {
          'kabang.cloud/project': 'domain:default/networked-app',
          'kabang.cloud/service-zone': 'intra',
        },
      },
      spec: {
        type: 'directory',
        lifecycle: 'production',
      },
      relations: [],
    } as Entity;

    const model = buildTopologyModel(project, [
      ingressToApp,
      ingressToK8s,
      appWorkload,
      k8sWorkload,
      intra,
    ]);

    expect(model.zones.map(zone => zone.id)).toEqual([
      'public',
      'app',
      'k8s',
      'intra',
    ]);
  });

  it('treats shared edge stacks as project members via partOf relations and hides off-project targets', () => {
    const project = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Domain',
      metadata: {
        namespace: 'default',
        name: 'guest-portal',
        title: 'Guest Portal',
      },
      spec: {
        owner: 'user:default/jane',
        team: 'group:default/guests',
      },
    } as Entity;

    const sharedEdgeStack = createEdgeSystem({
      name: 'shared-public-web-entry',
      title: 'TLS/mTLS Gateway',
      network: {
        ingressSubnet: 'public',
      },
      relations: [
        {
          type: 'partOf',
          targetRef: 'domain:default/guest-portal',
        },
        {
          type: 'routesTrafficTo',
          targetRef: 'component:default/guest-portal-web',
        },
        {
          type: 'routesTrafficTo',
          targetRef: 'component:default/guest-ops-console-ui',
        },
      ],
    });

    const web = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        namespace: 'default',
        name: 'guest-portal-web',
        annotations: {
          'kabang.cloud/project': 'domain:default/guest-portal',
        },
      },
      spec: {
        type: 'website',
        lifecycle: 'production',
      },
      relations: [],
    } as Entity;

    const model = buildTopologyModel(project, [sharedEdgeStack, web]);

    expect(model.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'system:default/shared-public-web-entry',
          target: 'component:default/guest-portal-web',
        }),
      ]),
    );

    expect(model.nodes).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'component:default/guest-ops-console-ui',
        }),
      ]),
    );
  });

  it('keeps room for additional catalog-defined zones', () => {
    const project = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Domain',
      metadata: {
        namespace: 'default',
        name: 'payments',
      },
      spec: {
        owner: 'user:default/jane',
        team: 'group:default/payments',
      },
    } as Entity;

    const component = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        namespace: 'default',
        name: 'payments-worker',
        annotations: {
          'kabang.cloud/project': 'domain:default/payments',
          'kabang.cloud/service-zone': 'batch',
        },
      },
      spec: {
        type: 'service',
      },
      relations: [],
    } as Entity;

    const model = buildTopologyModel(project, [component]);

    expect(model.zones).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'batch',
          title: 'Batch Subnet',
        }),
      ]),
    );
  });
});
