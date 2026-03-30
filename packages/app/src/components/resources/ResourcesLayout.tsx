import { PropsWithChildren } from 'react';
import {
  Content,
  Header,
  HeaderTabs,
  Link,
  Page,
} from '@backstage/core-components';

type ResourcesTabId = 'home' | 'project' | 'catalog';

const resourcesTabs = [
  {
    id: 'home',
    label: 'Home',
    tabProps: { component: Link, to: '/resources/home' },
  },
  {
    id: 'project',
    label: 'Project',
    tabProps: { component: Link, to: '/resources/project' },
  },
  {
    id: 'catalog',
    label: 'Catalog',
    tabProps: { component: Link, to: '/resources/catalog' },
  },
] as const satisfies Array<{
  id: ResourcesTabId;
  label: string;
  tabProps: {
    component: typeof Link;
    to: string;
  };
}>;

export function ResourcesLayout({
  children,
  currentTab,
}: PropsWithChildren<{
  currentTab: ResourcesTabId;
}>) {
  const selectedIndex = resourcesTabs.findIndex(tab => tab.id === currentTab);

  return (
    <Page themeId="home">
      <Header
        title="Resources"
        subtitle="Browse the platform inventory by view"
      />
      <HeaderTabs tabs={resourcesTabs} selectedIndex={selectedIndex} />
      <Content>{children}</Content>
    </Page>
  );
}
