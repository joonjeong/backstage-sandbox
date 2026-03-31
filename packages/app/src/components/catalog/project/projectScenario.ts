import type { Entity } from '@backstage/catalog-model';
import {
  PROJECT_DOMAIN_ROLE,
  PROJECT_DOMAIN_ROLE_ANNOTATION,
} from './projectDomain';

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
    'apiVersion: backstage.io/v1alpha1',
    'kind: Domain',
    'metadata:',
    `  name: ${valueOrPlaceholder(values.name, '<project-name>')}`,
    `  title: ${valueOrPlaceholder(values.title, '<Project Title>')}`,
    `  description: ${valueOrPlaceholder(
      values.description,
      '<Project description>',
    )}`,
    '  annotations:',
    `    ${PROJECT_DOMAIN_ROLE_ANNOTATION}: ${PROJECT_DOMAIN_ROLE}`,
    'spec:',
    `  owner: ${valueOrPlaceholder(values.owner, 'user:default/<owner>')}`,
    `  team: ${valueOrPlaceholder(values.team, 'group:default/<team>')}`,
    '',
  ].join('\n');
}
