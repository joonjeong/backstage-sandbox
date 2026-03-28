import type { AppendProjectMetadataInput } from './types';

export function parseAppendProjectMetadataInput(
  body: any,
): AppendProjectMetadataInput {
  const projectCode = String(
    body?.project_code ?? body?.projectCode ?? '',
  ).trim();
  const projectName = String(
    body?.project_name ?? body?.projectName ?? '',
  ).trim();
  const projectDescription = String(
    body?.project_description ?? body?.projectDescription ?? '',
  ).trim();

  if (!projectCode || !projectName || !projectDescription) {
    const error = new Error(
      'project_code, project_name, project_description are required',
    );
    (error as Error & { status?: number }).status = 400;
    throw error;
  }

  return {
    projectCode,
    projectName,
    projectDescription,
  };
}
