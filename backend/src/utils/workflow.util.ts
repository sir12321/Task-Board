export interface BoardWorkflowConfig {
  storyColumnId: string | null;
  workflowColumnIds: string[];
  resolvedColumnId: string | null;
  closedColumnId: string | null;
}

export interface LegacyWorkflowColumns {
  todoColumnId?: string | null;
  inProgressColumnId?: string | null;
}

export const parseWorkflowColumnIds = (value: string | null | undefined): string[] => {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((columnId): columnId is string => typeof columnId === 'string')
      : [];
  } catch {
    return [];
  }
};

export const getFallbackWorkflowColumnIds = (workflow: LegacyWorkflowColumns & {
  workflowColumnIds?: string[];
  resolvedColumnId?: string | null;
  closedColumnId?: string | null;
}): string[] => {
  if (workflow.workflowColumnIds && workflow.workflowColumnIds.length > 0) {
    return workflow.workflowColumnIds;
  }

  return [
    workflow.todoColumnId,
    workflow.inProgressColumnId,
    workflow.resolvedColumnId,
    workflow.closedColumnId,
  ].filter((columnId): columnId is string => Boolean(columnId));
};

export const getWorkflowSequence = (workflow: BoardWorkflowConfig): string[] =>
  workflow.workflowColumnIds.filter((columnId): columnId is string => Boolean(columnId));

export const getWorkflowStep = (
  workflow: BoardWorkflowConfig,
  columnId: string,
): number => getWorkflowSequence(workflow).findIndex((id) => id === columnId);

export const isResolvedColumn = (
  workflow: BoardWorkflowConfig,
  columnId: string,
): boolean =>
  workflow.resolvedColumnId === columnId || workflow.closedColumnId === columnId;

export const isClosedColumn = (
  workflow: BoardWorkflowConfig,
  columnId: string,
): boolean => workflow.closedColumnId === columnId;

export const validateWorkflowConfig = (
  workflow: BoardWorkflowConfig,
  availableColumnIds: string[],
): void => {
  if (!workflow.storyColumnId) {
    throw new Error('Workflow must include a Stories column');
  }

  if (!Array.isArray(workflow.workflowColumnIds)) {
    throw new Error('Workflow order must be a list of column ids');
  }

  const validIds = new Set(availableColumnIds);
  const usedIds = new Set<string>();

  if (!validIds.has(workflow.storyColumnId)) {
    throw new Error('Workflow Stories column is invalid');
  }

  if (!workflow.closedColumnId) {
    throw new Error('Workflow must include a Closed column');
  }

  if (!workflow.resolvedColumnId) {
    throw new Error('Workflow must include a Resolved column');
  }

  const nonStoryColumnIds = availableColumnIds.filter(
    (columnId) => columnId !== workflow.storyColumnId,
  );

  for (const columnId of workflow.workflowColumnIds) {
    if (!validIds.has(columnId)) {
      throw new Error('Workflow order contains an invalid column');
    }

    if (columnId === workflow.storyColumnId) {
      throw new Error('Stories column cannot be part of workflow order');
    }

    if (usedIds.has(columnId)) {
      throw new Error('Workflow order cannot contain duplicate columns');
    }

    usedIds.add(columnId);
  }

  if (usedIds.size !== nonStoryColumnIds.length) {
    throw new Error('Every non-story column must be included in workflow order');
  }

  if (!usedIds.has(workflow.resolvedColumnId)) {
    throw new Error('Resolved column must be part of workflow order');
  }

  if (!usedIds.has(workflow.closedColumnId)) {
    throw new Error('Closed column must be part of workflow order');
  }

  const sequence = getWorkflowSequence(workflow);
  if (sequence.length === 0 || sequence[sequence.length - 1] !== workflow.closedColumnId) {
    throw new Error('Closed column must be the last workflow stage');
  }
};
