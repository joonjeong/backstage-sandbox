import {
  RELATION_HAS_PART,
  RELATION_OWNED_BY,
  RELATION_OWNER_OF,
  RELATION_PART_OF,
  stringifyEntityRef,
} from '@backstage/catalog-model';
import {
  PROJECT_COMPONENT_ANNOTATION,
  PROJECT_DOMAIN_ROLE,
  PROJECT_DOMAIN_ROLE_ANNOTATION,
  EDGE_STACK_EXTENSION_KEY,
  EDGE_STACK_SYSTEM_ROLE,
  EDGE_STACK_SYSTEM_ROLE_ANNOTATION,
  RELATION_RECEIVES_TRAFFIC_FROM,
  RELATION_ROUTES_TRAFFIC_TO,
} from './types';
import { ConfigReader } from '@backstage/config';
import { ProjectDomainProcessor } from './processor';

describe('ProjectDomainProcessor', () => {
  it('ignores non-project entities during validation', async () => {
    const processor = new ProjectDomainProcessor(new ConfigReader({}), {
      info: jest.fn(),
    } as any);

    await expect(
      processor.validateEntityKind({
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: {
          name: 'payments-api',
        },
        spec: {
          type: 'service',
          lifecycle: 'production',
          owner: 'group:default/platform',
        },
      } as any),
    ).resolves.toBe(false);
  });

  it('rejects invalid project domains that miss required fields', async () => {
    const processor = new ProjectDomainProcessor(new ConfigReader({}), {
      info: jest.fn(),
    } as any);

    await expect(
      processor.validateEntityKind({
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Domain',
        metadata: {
          name: 'payments-platform',
          annotations: {
            [PROJECT_DOMAIN_ROLE_ANNOTATION]: PROJECT_DOMAIN_ROLE,
          },
        },
        spec: {
          owner: 'alice',
        },
      } as any),
    ).rejects.toThrow(/team/);
  });

  it('normalizes owner and team refs during preprocessing', async () => {
    const processor = new ProjectDomainProcessor(new ConfigReader({}), {
      info: jest.fn(),
    } as any);

    const processed = await processor.preProcessEntity(
      {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Domain',
        metadata: {
          name: 'payments-platform',
          annotations: {
            [PROJECT_DOMAIN_ROLE_ANNOTATION]: PROJECT_DOMAIN_ROLE,
          },
        },
        spec: {
          owner: 'alice',
          team: 'platform',
        },
      } as any,
      { type: 'file', target: '/tmp/project.yaml' },
      jest.fn(),
      { type: 'file', target: '/tmp/project.yaml' },
      {} as any,
    );

    expect(processed).toEqual(
      expect.objectContaining({
        spec: expect.objectContaining({
          owner: 'user:default/alice',
          team: 'group:default/platform',
        }),
      }),
    );
  });

  it('emits owner relations for both owner and team', async () => {
    const emit = jest.fn();
    const processor = new ProjectDomainProcessor(new ConfigReader({}), {
      info: jest.fn(),
    } as any);

    const processed = await processor.preProcessEntity(
      {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Domain',
        metadata: {
          name: 'payments-platform',
          annotations: {
            [PROJECT_DOMAIN_ROLE_ANNOTATION]: PROJECT_DOMAIN_ROLE,
          },
        },
        spec: {
          owner: 'alice',
          team: 'platform',
        },
      } as any,
      { type: 'file', target: '/tmp/project.yaml' },
      jest.fn(),
      { type: 'file', target: '/tmp/project.yaml' },
      {} as any,
    );

    await processor.postProcessEntity(
      processed,
      { type: 'file', target: '/tmp/project.yaml' },
      emit,
      {} as any,
    );

    const relations = emit.mock.calls.map(([result]) => result.relation);
    const relationRefs = relations.map(relation => ({
      type: relation.type,
      source: stringifyEntityRef(relation.source),
      target: stringifyEntityRef(relation.target),
    }));

    expect(relationRefs).toEqual(
      expect.arrayContaining([
        {
          type: RELATION_OWNED_BY,
          source: 'domain:default/payments-platform',
          target: 'user:default/alice',
        },
        {
          type: RELATION_OWNER_OF,
          source: 'user:default/alice',
          target: 'domain:default/payments-platform',
        },
        {
          type: RELATION_OWNED_BY,
          source: 'domain:default/payments-platform',
          target: 'group:default/platform',
        },
        {
          type: RELATION_OWNER_OF,
          source: 'group:default/platform',
          target: 'domain:default/payments-platform',
        },
      ]),
    );
  });

  it('normalizes component project annotations during preprocessing', async () => {
    const processor = new ProjectDomainProcessor(new ConfigReader({}), {
      info: jest.fn(),
    } as any);

    const processed = await processor.preProcessEntity(
      {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: {
          name: 'guest-ops-api',
          annotations: {
            [PROJECT_COMPONENT_ANNOTATION]: 'project:default/guest-ops-console',
          },
        },
        spec: {
          type: 'service',
          owner: 'group:default/guests',
          lifecycle: 'production',
        },
      } as any,
      { type: 'file', target: '/tmp/component.yaml' },
      jest.fn(),
      { type: 'file', target: '/tmp/component.yaml' },
      {} as any,
    );

    expect(processed.metadata.annotations).toEqual(
      expect.objectContaining({
        [PROJECT_COMPONENT_ANNOTATION]: 'domain:default/guest-ops-console',
      }),
    );
  });

  it('emits partOf and hasPart relations for project-aware components', async () => {
    const emit = jest.fn();
    const processor = new ProjectDomainProcessor(new ConfigReader({}), {
      info: jest.fn(),
    } as any);

    const processed = await processor.preProcessEntity(
      {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: {
          name: 'guest-ops-api',
          annotations: {
            [PROJECT_COMPONENT_ANNOTATION]: 'project:default/guest-ops-console',
          },
        },
        spec: {
          type: 'service',
          owner: 'group:default/guests',
          lifecycle: 'production',
        },
      } as any,
      { type: 'file', target: '/tmp/component.yaml' },
      jest.fn(),
      { type: 'file', target: '/tmp/component.yaml' },
      {} as any,
    );

    await processor.postProcessEntity(
      processed,
      { type: 'file', target: '/tmp/component.yaml' },
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
          type: RELATION_PART_OF,
          source: 'component:default/guest-ops-api',
          target: 'domain:default/guest-ops-console',
        },
        {
          type: RELATION_HAS_PART,
          source: 'domain:default/guest-ops-console',
          target: 'component:default/guest-ops-api',
        },
      ]),
    );
  });

  it('normalizes edge stack refs and emits traffic relations', async () => {
    const emit = jest.fn();
    const processor = new ProjectDomainProcessor(new ConfigReader({}), {
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
