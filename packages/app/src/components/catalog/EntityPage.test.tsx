import type { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { entityPage } from './EntityPage';

type MarkerProps = {
  children?: ReactNode;
};

type Predicate = ((...args: unknown[]) => boolean) & {
  __label?: string;
};

function createPredicate(label: string): Predicate {
  const predicate = (() => false) as Predicate;
  predicate.__label = label;
  return predicate;
}

function marker(testId: string) {
  return function Marker({ children }: MarkerProps) {
    return <div data-testid={testId}>{children}</div>;
  };
}

jest.mock('@material-ui/core', () => ({
  Button: marker('button'),
  Grid: marker('grid'),
}));

jest.mock('@backstage/plugin-api-docs', () => ({
  EntityApiDefinitionCard: marker('api-definition-card'),
  EntityConsumedApisCard: marker('consumed-apis-card'),
  EntityConsumingComponentsCard: marker('consuming-components-card'),
  EntityHasApisCard: marker('has-apis-card'),
  EntityProvidedApisCard: marker('provided-apis-card'),
  EntityProvidingComponentsCard: marker('providing-components-card'),
}));

jest.mock('@backstage/plugin-catalog', () => {
  const EntityLayout = ({ children }: MarkerProps) => (
    <section data-testid="entity-layout">{children}</section>
  );

  EntityLayout.Route = ({
    children,
    path,
    title,
  }: MarkerProps & {
    path: string;
    title: string;
  }) => (
    <section data-testid="entity-route" data-path={path} data-title={title}>
      {children}
    </section>
  );

  const EntitySwitch = ({ children }: MarkerProps) => (
    <section data-testid="entity-switch">{children}</section>
  );

  EntitySwitch.Case = ({
    children,
    if: condition,
  }: MarkerProps & {
    if?: Predicate;
  }) => (
    <section
      data-testid="entity-switch-case"
      data-if={condition?.__label ?? 'default'}
    >
      {children}
    </section>
  );

  return {
    EntityAboutCard: marker('about-card'),
    EntityDependsOnComponentsCard: marker('depends-on-components-card'),
    EntityDependsOnResourcesCard: marker('depends-on-resources-card'),
    EntityHasComponentsCard: marker('has-components-card'),
    EntityHasResourcesCard: marker('has-resources-card'),
    EntityHasSubcomponentsCard: marker('has-subcomponents-card'),
    EntityHasSystemsCard: marker('has-systems-card'),
    EntityLayout,
    EntityLinksCard: marker('links-card'),
    EntitySwitch,
    EntityOrphanWarning: marker('orphan-warning'),
    EntityProcessingErrorsPanel: marker('processing-errors-panel'),
    isComponentType: (type: string) => createPredicate(`component:${type}`),
    isKind: (kind: string) => createPredicate(`kind:${kind}`),
    hasCatalogProcessingErrors: createPredicate('catalog:processing-errors'),
    isOrphan: createPredicate('catalog:orphan'),
    hasRelationWarnings: createPredicate('catalog:relation-warnings'),
    EntityRelationWarning: marker('relation-warning'),
  };
});

jest.mock('@backstage/plugin-org', () => ({
  EntityUserProfileCard: marker('user-profile-card'),
  EntityGroupProfileCard: marker('group-profile-card'),
  EntityMembersListCard: marker('members-list-card'),
  EntityOwnershipCard: marker('ownership-card'),
}));

jest.mock('@backstage/plugin-techdocs', () => ({
  EntityTechdocsContent: marker('techdocs-content'),
}));

jest.mock('@backstage/core-components', () => ({
  EmptyState: marker('empty-state'),
}));

jest.mock('@backstage/plugin-catalog-graph', () => ({
  Direction: {
    TOP_BOTTOM: 'TOP_BOTTOM',
  },
  EntityCatalogGraphCard: marker('catalog-graph-card'),
}));

jest.mock('@backstage/plugin-techdocs-react', () => ({
  TechDocsAddons: marker('techdocs-addons'),
}));

jest.mock('@backstage/plugin-techdocs-module-addons-contrib', () => ({
  ReportIssue: marker('report-issue'),
}));

jest.mock('@backstage/plugin-kubernetes', () => ({
  EntityKubernetesContent: marker('kubernetes-content'),
  isKubernetesAvailable: createPredicate('kubernetes:available'),
}));

jest.mock('./project/ProjectEntityPage', () => ({
  ProjectEntityPage: () => <div data-testid="project-entity-page" />,
}));

jest.mock('./project/projectDomain', () => ({
  isProjectDomainEntity: createPredicate('project:domain'),
}));

function getDirectChildrenByTestId(parent: HTMLElement, testId: string) {
  return Array.from(parent.children).filter(
    child => child.getAttribute('data-testid') === testId,
  ) as HTMLElement[];
}

function getCaseByLabel(parent: HTMLElement, label: string) {
  const child = getDirectChildrenByTestId(parent, 'entity-switch-case').find(
    caseElement => caseElement.getAttribute('data-if') === label,
  );

  expect(child).toBeTruthy();
  return child as HTMLElement;
}

function getRoutesFromCase(caseElement: HTMLElement) {
  const layout = getDirectChildrenByTestId(caseElement, 'entity-layout')[0];

  expect(layout).toBeTruthy();

  return getDirectChildrenByTestId(layout, 'entity-route').map(route => ({
    path: route.getAttribute('data-path'),
    title: route.getAttribute('data-title'),
  }));
}

describe('entityPage', () => {
  it('preserves the entity kind and component type routing structure', () => {
    const { container } = render(entityPage);
    const rootSwitch = container.querySelector(
      '[data-testid="entity-switch"]',
    ) as HTMLElement;

    expect(rootSwitch).toBeTruthy();
    const rootCases = getDirectChildrenByTestId(
      rootSwitch,
      'entity-switch-case',
    );

    expect(
      rootCases.map(caseElement => caseElement.getAttribute('data-if')),
    ).toEqual([
      'kind:component',
      'kind:api',
      'kind:group',
      'kind:user',
      'kind:system',
      'default',
      'kind:domain',
      'default',
    ]);

    const componentCase = getCaseByLabel(rootSwitch, 'kind:component');
    const componentSwitch = getDirectChildrenByTestId(
      componentCase,
      'entity-switch',
    )[0];

    expect(componentSwitch).toBeTruthy();
    expect(
      getDirectChildrenByTestId(componentSwitch, 'entity-switch-case').map(
        caseElement => caseElement.getAttribute('data-if'),
      ),
    ).toEqual(['component:service', 'component:website', 'default']);

    expect(
      getRoutesFromCase(getCaseByLabel(componentSwitch, 'component:service')),
    ).toEqual([
      { path: '/', title: 'Overview' },
      { path: '/ci-cd', title: 'CI/CD' },
      { path: '/kubernetes', title: 'Kubernetes' },
      { path: '/api', title: 'API' },
      { path: '/dependencies', title: 'Dependencies' },
      { path: '/docs', title: 'Docs' },
    ]);

    expect(
      getRoutesFromCase(getCaseByLabel(componentSwitch, 'component:website')),
    ).toEqual([
      { path: '/', title: 'Overview' },
      { path: '/ci-cd', title: 'CI/CD' },
      { path: '/kubernetes', title: 'Kubernetes' },
      { path: '/dependencies', title: 'Dependencies' },
      { path: '/docs', title: 'Docs' },
    ]);

    expect(
      getRoutesFromCase(getCaseByLabel(componentSwitch, 'default')),
    ).toEqual([
      { path: '/', title: 'Overview' },
      { path: '/docs', title: 'Docs' },
    ]);

    expect(getRoutesFromCase(getCaseByLabel(rootSwitch, 'kind:api'))).toEqual([
      { path: '/', title: 'Overview' },
      { path: '/definition', title: 'Definition' },
    ]);

    expect(getRoutesFromCase(getCaseByLabel(rootSwitch, 'kind:group'))).toEqual(
      [{ path: '/', title: 'Overview' }],
    );

    expect(getRoutesFromCase(getCaseByLabel(rootSwitch, 'kind:user'))).toEqual([
      { path: '/', title: 'Overview' },
    ]);

    expect(
      getRoutesFromCase(getCaseByLabel(rootSwitch, 'kind:system')),
    ).toEqual([
      { path: '/', title: 'Overview' },
      { path: '/diagram', title: 'Diagram' },
    ]);

    const projectDomainCase = rootCases.find(caseElement =>
      caseElement.querySelector('[data-testid="project-entity-page"]'),
    );

    expect(projectDomainCase).toBeTruthy();

    expect(
      getRoutesFromCase(getCaseByLabel(rootSwitch, 'kind:domain')),
    ).toEqual([{ path: '/', title: 'Overview' }]);

    expect(getRoutesFromCase(rootCases[rootCases.length - 1])).toEqual([
      { path: '/', title: 'Overview' },
      { path: '/docs', title: 'Docs' },
    ]);
  });
});
