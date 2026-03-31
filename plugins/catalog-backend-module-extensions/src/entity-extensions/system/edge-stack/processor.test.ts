import {
  RELATION_HAS_PART,
  RELATION_OWNED_BY,
  RELATION_OWNER_OF,
  RELATION_PART_OF,
  stringifyEntityRef,
} from '@backstage/catalog-model';
import { ConfigReader } from '@backstage/config';
import {
  RELATION_RECEIVES_TRAFFIC_FROM,
  RELATION_ROUTES_TRAFFIC_TO,
} from './types';
import {
  EDGE_STACK_EXTENSION_KEY,
  EDGE_STACK_SYSTEM_ROLE,
  EDGE_STACK_SYSTEM_ROLE_ANNOTATION,
} from './types';
import { EdgeStackSystemProcessor } from './processor';

describe('EdgeStackSystemProcessor', () => {
  it('ignores non-edge systems during validation', async () => {
    const processor = new EdgeStackSystemProcessor(new ConfigReader({}), {
      info: jest.fn(),
    } as any);

    await expect(
      processor.validateEntityKind({
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'System',
        metadata: {
          name: 'payments',
        },
        spec: {
          owner: 'group:default/platform',
        },
      } as any),
    ).resolves.toBe(false);
  });

  it('rejects invalid edge-stack systems that miss extension fields', async () => {
    const processor = new EdgeStackSystemProcessor(new ConfigReader({}), {
      info: jest.fn(),
    } as any);

    await expect(
      processor.validateEntityKind({
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'System',
        metadata: {
          name: 'public-web-entry-prod',
          annotations: {
            [EDGE_STACK_SYSTEM_ROLE_ANNOTATION]: EDGE_STACK_SYSTEM_ROLE,
          },
        },
        spec: {
          owner: 'platform',
          [EDGE_STACK_EXTENSION_KEY]: {},
        },
      } as any),
    ).rejects.toThrow(/x-edgestack.team/);
  });

  it('normalizes refs and emits traffic relations', async () => {
    const emit = jest.fn();
    const processor = new EdgeStackSystemProcessor(new ConfigReader({}), {
      info: jest.fn(),
    } as any);

    const processed = await processor.preProcessEntity(
      {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'System',
        metadata: {
          name: 'public-web-entry-prod',
          annotations: {
            [EDGE_STACK_SYSTEM_ROLE_ANNOTATION]: EDGE_STACK_SYSTEM_ROLE,
          },
        },
        spec: {
          owner: 'alice',
          [EDGE_STACK_EXTENSION_KEY]: {
            team: 'platform',
            pattern: 'public-web-entry',
            projects: ['project:default/guest-portal'],
            attachments: [
              {
                role: 'shield',
                kind: 'waf',
                entityRef: 'shared-waf',
              },
            ],
            hops: [
              {
                role: 'ingress',
                kind: 'alb',
                entityRef: 'public-alb',
              },
            ],
            targets: [
              {
                entityRef: 'guest-portal-web',
                trafficType: 'http',
              },
            ],
          },
        },
      } as any,
      { type: 'file', target: '/tmp/edge-stack.yaml' },
      jest.fn(),
      { type: 'file', target: '/tmp/edge-stack.yaml' },
      {} as any,
    );

    expect(processed).toEqual(
      expect.objectContaining({
        spec: expect.objectContaining({
          owner: 'group:default/alice',
          [EDGE_STACK_EXTENSION_KEY]: expect.objectContaining({
            team: 'group:default/platform',
            projects: ['domain:default/guest-portal'],
            attachments: [
              expect.objectContaining({
                entityRef: 'resource:default/shared-waf',
              }),
            ],
            hops: [
              expect.objectContaining({
                entityRef: 'resource:default/public-alb',
              }),
            ],
            targets: [
              expect.objectContaining({
                entityRef: 'component:default/guest-portal-web',
              }),
            ],
          }),
        }),
      }),
    );

    await processor.postProcessEntity(
      processed,
      { type: 'file', target: '/tmp/edge-stack.yaml' },
      emit,
      {} as any,
    );

    const relationRefs = emit.mock.calls.map(([result]) => ({
      type: result.relation.type,
      source: stringifyEntityRef(result.relation.source),
      target: stringifyEntityRef(result.relation.target),
    }));

    expect(relationRefs).toEqual(
      expect.arrayContaining([
        {
          type: RELATION_OWNED_BY,
          source: 'system:default/public-web-entry-prod',
          target: 'group:default/alice',
        },
        {
          type: RELATION_OWNER_OF,
          source: 'group:default/alice',
          target: 'system:default/public-web-entry-prod',
        },
        {
          type: RELATION_OWNED_BY,
          source: 'system:default/public-web-entry-prod',
          target: 'group:default/platform',
        },
        {
          type: RELATION_OWNER_OF,
          source: 'group:default/platform',
          target: 'system:default/public-web-entry-prod',
        },
        {
          type: RELATION_PART_OF,
          source: 'resource:default/shared-waf',
          target: 'system:default/public-web-entry-prod',
        },
        {
          type: RELATION_HAS_PART,
          source: 'system:default/public-web-entry-prod',
          target: 'resource:default/shared-waf',
        },
        {
          type: RELATION_PART_OF,
          source: 'system:default/public-web-entry-prod',
          target: 'domain:default/guest-portal',
        },
        {
          type: RELATION_HAS_PART,
          source: 'domain:default/guest-portal',
          target: 'system:default/public-web-entry-prod',
        },
        {
          type: RELATION_PART_OF,
          source: 'resource:default/public-alb',
          target: 'system:default/public-web-entry-prod',
        },
        {
          type: RELATION_HAS_PART,
          source: 'system:default/public-web-entry-prod',
          target: 'resource:default/public-alb',
        },
        {
          type: RELATION_ROUTES_TRAFFIC_TO,
          source: 'system:default/public-web-entry-prod',
          target: 'component:default/guest-portal-web',
        },
        {
          type: RELATION_RECEIVES_TRAFFIC_FROM,
          source: 'component:default/guest-portal-web',
          target: 'system:default/public-web-entry-prod',
        },
      ]),
    );
  });
});
