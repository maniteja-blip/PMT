import { TaskPriority, TaskStatus } from "@prisma/client";

export type DepNode = {
  id: string;
  title: string;
  status: TaskStatus;
  dueDate: Date | null;
  priority: TaskPriority;
};

// Map of (toTaskId -> fromTaskIds)
export type DepIndex = Map<string, string[]>;

function priorityWeight(p: TaskPriority) {
  switch (p) {
    case "URGENT":
      return 4;
    case "HIGH":
      return 3;
    case "MEDIUM":
      return 2;
    case "LOW":
      return 1;
  }
}

function dueKey(d: Date | null) {
  return d ? d.getTime() : Number.POSITIVE_INFINITY;
}

export function unmetDeps(taskId: string, nodes: Map<string, DepNode>, deps: DepIndex) {
  const fromIds = deps.get(taskId) ?? [];
  return fromIds
    .map((id) => nodes.get(id))
    .filter((x): x is DepNode => Boolean(x))
    .filter((t) => t.status !== TaskStatus.DONE);
}

// Returns a single "critical" chain to unblock `task`.
// The first item is the earliest task to do; last item is the blocked task.
export function unblockChain(taskId: string, nodes: Map<string, DepNode>, deps: DepIndex) {
  const chain: DepNode[] = [];
  const seen = new Set<string>();

  // Walk upstream picking the most urgent unmet dep.
  let cursorId: string | null = taskId;
  while (cursorId) {
    if (seen.has(cursorId)) break;
    seen.add(cursorId);

    const cursor = nodes.get(cursorId);
    if (!cursor) break;

    const unmet = unmetDeps(cursorId, nodes, deps);
    if (unmet.length === 0) {
      chain.push(cursor);
      break;
    }

    // pick dep with earliest due, then highest priority
    const next = [...unmet].sort((a, b) => {
      const da = dueKey(a.dueDate);
      const db = dueKey(b.dueDate);
      if (da !== db) return da - db;
      return priorityWeight(b.priority) - priorityWeight(a.priority);
    })[0]!;

    chain.push(cursor);
    cursorId = next.id;
  }

  return chain.reverse();
}

export function unblockSuggestion(taskId: string, nodes: Map<string, DepNode>, deps: DepIndex) {
  const chain = unblockChain(taskId, nodes, deps);
  const next = chain[0] ?? null;
  return {
    chain,
    next,
    depth: chain.length,
  };
}
