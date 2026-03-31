import type { Entity } from '@backstage/catalog-model';
import { buildProjectServiceMapModel } from './ProjectServiceMap.model';
import {
  getDefaultSelectedNodeId,
  getSelectedNodeSummary,
  getVisibleNodeRows,
} from './ProjectServiceMap.view-model';

describe('ProjectServiceMap view model helpers', () => {
  it('prefers an edge stack as the default selected node', () => {
    const project = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Domain',
      metadata: {
        namespace: 'default',
        name: 'guest-portal',
      },
    } as Entity;

    const edgeStack = {
      apiVersion: 'kabang.cloud/v1',
      kind: 'EdgeStack',
      metadata: {
        namespace: 'default',
        name: 'public-web-entry-prod',
        annotations: {
          'kabang.cloud/project': 'domain:default/guest-portal',
        },
      },
      spec: {
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
          'kabang.cloud/project': 'domain:default/guest-portal',
        },
      },
      spec: {
        type: 'website',
      },
    } as Entity;

    const model = buildProjectServiceMapModel(project, [edgeStack, web]);

    expect(getDefaultSelectedNodeId(model)).toBe(
      'edgestack:default/public-web-entry-prod',
    );
  });

  it('builds inventory rows and selected-node summaries from the rendered model', () => {
    const project = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Domain',
      metadata: {
        namespace: 'default',
        name: 'guest-portal',
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
      },
    } as Entity;

    const model = buildProjectServiceMapModel(project, [web, api]);

    expect(getVisibleNodeRows(model)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'component:default/guest-portal-web',
          zone: 'Public Subnet',
          exposure: 'public',
          incomingCount: 1,
          outgoingCount: 1,
        }),
        expect.objectContaining({
          id: 'component:default/guest-portal-api',
          zone: 'Private Subnet',
          exposure: 'private',
          incomingCount: 1,
          outgoingCount: 0,
        }),
      ]),
    );

    expect(
      getSelectedNodeSummary(model, 'component:default/guest-portal-web'),
    ).toEqual(
      expect.objectContaining({
        zone: 'Public Subnet',
        incomingCount: 1,
        outgoingCount: 1,
        node: expect.objectContaining({
          id: 'component:default/guest-portal-web',
        }),
      }),
    );
  });
});
