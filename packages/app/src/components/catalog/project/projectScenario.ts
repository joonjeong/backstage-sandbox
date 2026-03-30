import type { Entity } from '@backstage/catalog-model';

export type ProjectScenarioValues = {
  name: string;
  title: string;
  description: string;
  owner: string;
  team: string;
};

export const emptyProjectScenarioValues: ProjectScenarioValues = {
  name: '',
  title: '',
  description: '',
  owner: '',
  team: '',
};

export function projectScenarioValuesFromEntity(
  entity: Entity,
): ProjectScenarioValues {
  return {
    name: entity.metadata.name ?? '',
    title: entity.metadata.title ?? '',
    description: entity.metadata.description ?? '',
    owner: String(entity.spec?.owner ?? ''),
    team: String(entity.spec?.team ?? ''),
  };
}

function valueOrPlaceholder(value: string, placeholder: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : placeholder;
}

export function buildProjectEntityYaml(values: ProjectScenarioValues): string {
  return [
    'apiVersion: kabang.cloud/v1',
    'kind: Project',
    'metadata:',
    `  name: ${valueOrPlaceholder(values.name, '<project-name>')}`,
    `  title: ${valueOrPlaceholder(values.title, '<Project Title>')}`,
    `  description: ${valueOrPlaceholder(
      values.description,
      '<Project description>',
    )}`,
    'spec:',
    `  owner: ${valueOrPlaceholder(values.owner, 'user:default/<owner>')}`,
    `  team: ${valueOrPlaceholder(values.team, 'group:default/<team>')}`,
    '',
  ].join('\n');
}
