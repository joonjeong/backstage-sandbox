export type ProjectMetadataRecord = {
  eventId: string;
  projectCode: string;
  projectName: string;
  projectDescription: string;
  createdAt: string;
  createdAtEpochMs: number;
};

export type AppendProjectMetadataInput = {
  projectCode: string;
  projectName: string;
  projectDescription: string;
};

export interface ProjectMetadataRepository {
  append(input: AppendProjectMetadataInput): Promise<ProjectMetadataRecord>;
  getLatest(projectCode: string): Promise<ProjectMetadataRecord | undefined>;
  listLatest(): Promise<ProjectMetadataRecord[]>;
  listHistory(projectCode: string): Promise<ProjectMetadataRecord[]>;
}
