type ProcessingErrorEntry = {
  entityRefHint: string;
  projectCode?: string;
  errors: string[];
  capturedAt: string;
};

const processingErrors = new Map<string, ProcessingErrorEntry>();

export function recordProjectMetadataProcessingError(
  entry: ProcessingErrorEntry,
) {
  processingErrors.set(entry.entityRefHint, entry);
}

export function getProjectMetadataProcessingErrors(): ProcessingErrorEntry[] {
  return Array.from(processingErrors.values()).sort((a, b) =>
    b.capturedAt.localeCompare(a.capturedAt),
  );
}
