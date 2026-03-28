import {
  RELATION_HAS_PART,
  RELATION_OWNED_BY,
  RELATION_OWNER_OF,
  RELATION_PART_OF,
  stringifyEntityRef,
} from '@backstage/catalog-model';
import { PROJECT_COMPONENT_ANNOTATION } from './types';
import { ConfigReader } from '@backstage/config';
import { ProjectProcessor } from './processor';

describe('ProjectProcessor', () => {
  it('ignores non-project entities during validation', async () => {
    const processor = new ProjectProcessor(
      new ConfigReader({}),
      { info: jest.fn() } as any,
    );

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

  it('rejects invalid Project entities that miss required fields', async () => {
    const processor = new ProjectProcessor(
      new ConfigReader({}),
      { info: jest.fn() } as any,
    );

    await expect(
      processor.validateEntityKind({
        apiVersion: 'kabang.cloud/v1',
        kind: 'Project',
        metadata: {
          name: 'payments-platform',
        },
        spec: {
          owner: 'alice',
        },
      } as any),
    ).rejects.toThrow(/team/);
  });

  it('normalizes owner and team refs during preprocessing', async () => {
    const processor = new ProjectProcessor(
      new ConfigReader({}),
      { info: jest.fn() } as any,
    );

    const processed = await processor.preProcessEntity(
      {
        apiVersion: 'kabang.cloud/v1',
        kind: 'Project',
        metadata: {
          name: 'payments-platform',
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
    const processor = new ProjectProcessor(
      new ConfigReader({}),
      { info: jest.fn() } as any,
    );

    const processed = await processor.preProcessEntity(
      {
        apiVersion: 'kabang.cloud/v1',
        kind: 'Project',
        metadata: {
          name: 'payments-platform',
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
          source: 'project:default/payments-platform',
          target: 'user:default/alice',
        },
        {
          type: RELATION_OWNER_OF,
          source: 'user:default/alice',
          target: 'project:default/payments-platform',
        },
        {
          type: RELATION_OWNED_BY,
          source: 'project:default/payments-platform',
          target: 'group:default/platform',
        },
        {
          type: RELATION_OWNER_OF,
          source: 'group:default/platform',
          target: 'project:default/payments-platform',
        },
      ]),
    );
  });

  it('normalizes component project annotations during preprocessing', async () => {
    const processor = new ProjectProcessor(
      new ConfigReader({}),
      { info: jest.fn() } as any,
    );

    const processed = await processor.preProcessEntity(
      {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: {
          name: 'guest-ops-api',
          annotations: {
            [PROJECT_COMPONENT_ANNOTATION]: 'guest-ops-console',
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
        [PROJECT_COMPONENT_ANNOTATION]: 'project:default/guest-ops-console',
      }),
    );
  });

  it('emits partOf and hasPart relations for project-aware components', async () => {
    const emit = jest.fn();
    const processor = new ProjectProcessor(
      new ConfigReader({}),
      { info: jest.fn() } as any,
    );

    const processed = await processor.preProcessEntity(
      {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: {
          name: 'guest-ops-api',
          annotations: {
            [PROJECT_COMPONENT_ANNOTATION]: 'guest-ops-console',
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
          target: 'project:default/guest-ops-console',
        },
        {
          type: RELATION_HAS_PART,
          source: 'project:default/guest-ops-console',
          target: 'component:default/guest-ops-api',
        },
      ]),
    );
  });
});
