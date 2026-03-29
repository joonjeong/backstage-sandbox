import type { Entity } from '@backstage/catalog-model';
import { buildProjectServiceMapModel } from './ProjectServiceMap.model';

describe('buildProjectServiceMapModel', () => {
  it('builds public ingress and service traffic edges from catalog data', () => {
    const project = {
      apiVersion: 'kabang.cloud/v1',
      kind: 'Project',
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
          'kabang.cloud/project': 'project:default/guest-portal',
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
          'kabang.cloud/project': 'project:default/guest-portal',
          'kabang.cloud/service-zone': 'private',
        },
      },
      spec: {
        type: 'service',
        lifecycle: 'production',
      },
      relations: [],
    } as Entity;

    const model = buildProjectServiceMapModel(project, [web, api]);

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
      apiVersion: 'kabang.cloud/v1',
      kind: 'Project',
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
      apiVersion: 'kabang.cloud/v1',
      kind: 'EdgeStack',
      metadata: {
        namespace: 'default',
        name: 'public-web-entry-prod',
        title: 'Public Web Entry',
        annotations: {
          'kabang.cloud/project': 'project:default/guest-portal',
        },
      },
      spec: {
        pattern: 'public-web-entry',
        network: {
          ingressSubnet: 'public',
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
          'kabang.cloud/project': 'project:default/guest-portal',
        },
      },
      spec: {
        type: 'website',
        lifecycle: 'production',
      },
      relations: [],
    } as Entity;

    const model = buildProjectServiceMapModel(project, [edgeStack, web]);

    expect(model.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'edgestack:default/public-web-entry-prod',
          zone: 'public',
        }),
      ]),
    );

    expect(model.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'public-traffic',
          target: 'edgestack:default/public-web-entry-prod',
          label: 'ingress',
        }),
        expect.objectContaining({
          source: 'edgestack:default/public-web-entry-prod',
          target: 'component:default/guest-portal-web',
          label: 'routes traffic',
        }),
      ]),
    );
  });

  it('treats shared edge stacks as project members via partOf relations and hides off-project targets', () => {
    const project = {
      apiVersion: 'kabang.cloud/v1',
      kind: 'Project',
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

    const sharedEdgeStack = {
      apiVersion: 'kabang.cloud/v1',
      kind: 'EdgeStack',
      metadata: {
        namespace: 'default',
        name: 'shared-public-web-entry',
        title: 'Shared Public Web Entry',
      },
      spec: {
        pattern: 'public-web-entry',
        network: {
          ingressSubnet: 'public',
        },
      },
      relations: [
        {
          type: 'partOf',
          targetRef: 'project:default/guest-portal',
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
    } as Entity;

    const web = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        namespace: 'default',
        name: 'guest-portal-web',
        annotations: {
          'kabang.cloud/project': 'project:default/guest-portal',
        },
      },
      spec: {
        type: 'website',
        lifecycle: 'production',
      },
      relations: [],
    } as Entity;

    const model = buildProjectServiceMapModel(project, [sharedEdgeStack, web]);

    expect(model.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'edgestack:default/shared-public-web-entry',
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
      apiVersion: 'kabang.cloud/v1',
      kind: 'Project',
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
          'kabang.cloud/project': 'project:default/payments',
          'kabang.cloud/service-zone': 'batch',
        },
      },
      spec: {
        type: 'service',
      },
      relations: [],
    } as Entity;

    const model = buildProjectServiceMapModel(project, [component]);

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
