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
          title: 'Batch Zone',
        }),
      ]),
    );
  });
});
