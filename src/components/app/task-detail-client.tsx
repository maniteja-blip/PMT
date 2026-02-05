"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addComment, deleteComment } from "@/app/(app)/actions/comments";
import { addDependency, removeDependency } from "@/app/(app)/actions/dependencies";
import { deleteTask, updateTask, updateTaskStatus } from "@/app/(app)/actions/tasks";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PriorityPill, StatusPill } from "@/components/app/pills";
import { TaskPriority, TaskStatus } from "@prisma/client";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";

const statuses: { value: TaskStatus; label: string }[] = [
  { value: TaskStatus.BACKLOG, label: "Backlog" },
  { value: TaskStatus.TODO, label: "Todo" },
  { value: TaskStatus.IN_PROGRESS, label: "In progress" },
  { value: TaskStatus.BLOCKED, label: "Blocked" },
  { value: TaskStatus.DONE, label: "Done" },
];

const priorities: { value: TaskPriority; label: string }[] = [
  { value: TaskPriority.LOW, label: "Low" },
  { value: TaskPriority.MEDIUM, label: "Medium" },
  { value: TaskPriority.HIGH, label: "High" },
  { value: TaskPriority.URGENT, label: "Urgent" },
];

export function TaskDetailClient({
  task,
  projects,
  people,
  candidates,
  deps,
  comments,
  activity,
  canAdmin,
  currentUserId,
  canEdit,
  canDelete,
  canManage,
  canEditDependencies = false,
  variant = "page",
}: {
  task: {
    id: string;
    title: string;
    description: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    estimateHours: number;
    dueDate: string | null;
    projectId: string;
    assigneeId: string | null;
  };
  projects: { id: string; name: string }[];
  people: { id: string; name: string }[];
  candidates: { id: string; title: string; status: TaskStatus }[];
  deps: {
    blockedBy: { fromTaskId: string; fromTask: { id: string; title: string; status: TaskStatus } }[];
    blocks: { toTaskId: string; toTask: { id: string; title: string; status: TaskStatus } }[];
  };
  comments: { id: string; body: string; createdAt: string; author: { id: string; name: string } }[];
  activity: { id: string; action: string; entityType: string; createdAt: string; metadata: unknown }[];
  canAdmin: boolean;
  currentUserId: string;
  canEdit: boolean;
  canDelete: boolean;
  canManage: boolean;
  canEditDependencies?: boolean;
  variant?: "page" | "modal";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [projectId, setProjectId] = useState(task.projectId);
  const [assigneeId, setAssigneeId] = useState(task.assigneeId ?? "");
  const [dueDate, setDueDate] = useState(task.dueDate ?? "");
  const [estimateHours, setEstimateHours] = useState(String(task.estimateHours));
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [comment, setComment] = useState("");
  const [newBlockedBy, setNewBlockedBy] = useState("");
  const [newBlocks, setNewBlocks] = useState("");

  const projectName = useMemo(
    () => projects.find((p) => p.id === projectId)?.name ?? "",
    [projects, projectId],
  );

  return (
    <div className={variant === "modal" ? "grid gap-4" : "grid gap-6"}>
      {variant === "page" ? (
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="font-display text-3xl leading-none tracking-tight">Task</div>
            <div className="mt-2 text-sm text-muted-foreground">
              <Link href="/tasks" className="underline">
                Tasks
              </Link>
              {" / "}
              <Link href={`/projects/${task.projectId}`} className="underline">
                {projectName || "Project"}
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              className="rounded-2xl"
              disabled={pending}
              onClick={() => router.refresh()}
            >
              Refresh
            </Button>
            {canDelete ? (
              <Button
                variant="destructive"
                className="rounded-2xl"
                disabled={pending}
                onClick={() => {
                  if (!window.confirm("Delete this task?")) return;
                  startTransition(async () => {
                    await deleteTask(task.id);
                    router.push("/tasks");
                  });
                }}
              >
                Delete
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate font-display text-xl leading-none">{title}</div>
            <div className="mt-1 text-xs text-muted-foreground">{projectName || "Project"}</div>
          </div>
          {canDelete ? (
            <Button
              variant="destructive"
              className="rounded-2xl"
              disabled={pending}
              onClick={() => {
                if (!window.confirm("Delete this task?")) return;
                startTransition(async () => {
                  try {
                    await deleteTask(task.id);
                    toast.success("Task deleted");
                    router.push("/tasks");
                  } catch (e) {
                    toast.error(getErrorMessage(e));
                  }
                });
              }}
            >
              Delete
            </Button>
          ) : null}
        </div>
      )}

      <div
        className={
          variant === "modal"
            ? "grid gap-4 xl:grid-cols-[minmax(0,1fr)_480px]"
            : "grid gap-4 lg:grid-cols-3"
        }
      >
        <Card
          className={
            variant === "modal"
              ? "grain surface rounded-3xl border bg-card/80 p-5"
              : "grain surface rounded-3xl border bg-card/80 p-5 lg:col-span-2"
          }
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-semibold tracking-wide text-muted-foreground">Status</div>
              <div className="mt-2 flex items-center gap-2">
                <StatusPill status={status} />
                <PriorityPill priority={priority} />
              </div>
            </div>
            {canEdit ? (
              <Button
                className="rounded-2xl"
                disabled={pending}
                onClick={() => {
                  startTransition(async () => {
                    try {
                      await updateTask({
                        id: task.id,
                        title,
                        description,
                        projectId,
                        assigneeId,
                        dueDate,
                        estimateHours,
                        status,
                        priority,
                      });
                      toast.success("Saved");
                      router.refresh();
                    } catch (e) {
                      toast.error(getErrorMessage(e));
                    }
                  });
                }}
              >
                {pending ? "Saving..." : "Save"}
              </Button>
            ) : (
              <div className="text-xs text-muted-foreground">Read-only</div>
            )}
          </div>

          <Separator className="my-4" />

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Title</Label>
              <Input
                className="rounded-2xl"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={!canEdit || pending}
              />
            </div>

            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea
                className="rounded-2xl"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={!canEdit || pending}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Project</Label>
                <Select value={projectId} onValueChange={setProjectId} disabled={!canManage || pending}>
                  <SelectTrigger className="rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Assignee</Label>
                <Select
                  value={assigneeId}
                  onValueChange={(v) => setAssigneeId(v === "__unassigned__" ? "" : v)}
                  disabled={!canManage || pending}
                >
                  <SelectTrigger className="rounded-2xl">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__unassigned__">Unassigned</SelectItem>
                    {people.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div className="grid gap-2 md:col-span-2">
                <Label>Due date</Label>
                <Input
                  className="rounded-2xl"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={!canEdit || pending}
                />
              </div>
              <div className="grid gap-2">
                <Label>Estimate (hours)</Label>
                <Input
                  className="rounded-2xl"
                  inputMode="decimal"
                  value={estimateHours}
                  onChange={(e) => setEstimateHours(e.target.value)}
                  disabled={!canEdit || pending}
                />
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select
                  value={status}
                  disabled={!canEdit || pending}
                  onValueChange={(v) => {
                    const next = v as TaskStatus;
                    setStatus(next);
                    if (canEdit) {
                      startTransition(async () => {
                        try {
                          await updateTaskStatus({ id: task.id, status: next });
                          toast.success(`Status: ${next.toLowerCase()}`);
                          router.refresh();
                        } catch (e) {
                          toast.error(getErrorMessage(e));
                        }
                      });
                    }
                  }}
                >
                  <SelectTrigger className="rounded-2xl" data-testid="status-select-trigger">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Priority</Label>
                <Select
                  value={priority}
                  onValueChange={(v) => setPriority(v as TaskPriority)}
                  disabled={!canManage || pending}
                >
                  <SelectTrigger className="rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorities.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-4">
          <Card className="grain surface rounded-3xl border bg-card/80 p-5">
            <div className="text-sm font-semibold">Dependencies</div>
            <div className="mt-2 text-sm text-muted-foreground">
              Blocked-by and blocks. Editing here auto-updates status.
            </div>
            <Separator className="my-4" />

            <div className="grid gap-4">
              <div className="grid gap-2">
                <div className="text-xs font-semibold tracking-wide text-muted-foreground">Blocked by</div>
                {deps.blockedBy.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No prerequisites.</div>
                ) : (
                  <div className="grid gap-2">
                    {deps.blockedBy.map((d) => (
                      <div key={d.fromTaskId} className="flex items-center justify-between gap-2 rounded-2xl border bg-background/60 px-3 py-2">
                        <div className="min-w-0">
                          <a href={`/tasks?open=${d.fromTask.id}`} className="truncate text-sm font-medium hover:underline">
                            {d.fromTask.title}
                          </a>
                          <div className="mt-1">
                            <StatusPill status={d.fromTask.status} />
                          </div>
                        </div>
                        {canEdit || canEditDependencies ? (
                          <Button
                            variant="secondary"
                            className="h-8 rounded-xl"
                            disabled={pending}
                            onClick={() => {
                              startTransition(async () => {
                                try {
                                  await removeDependency({ toTaskId: task.id, fromTaskId: d.fromTaskId });
                                  toast.success("Dependency removed");
                                  router.refresh();
                                } catch (e) {
                                  toast.error(getErrorMessage(e));
                                }
                              });
                            }}
                          >
                            Remove
                          </Button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}

                {canEdit || canEditDependencies ? (
                  <div className="grid gap-2 rounded-2xl border bg-background/40 p-3">
                    <div className="text-xs text-muted-foreground">Add prerequisite</div>
                    <Select value={newBlockedBy} onValueChange={setNewBlockedBy}>
                      <SelectTrigger className="rounded-2xl">
                        <SelectValue placeholder="Select a task" />
                      </SelectTrigger>
                      <SelectContent>
                        {candidates
                          .filter((c) => !deps.blockedBy.some((d) => d.fromTaskId === c.id))
                          .slice(0, 200)
                          .map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.status.toLowerCase()}: {c.title}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Button
                      className="rounded-2xl"
                      disabled={pending || !newBlockedBy}
                      onClick={() => {
                        startTransition(async () => {
                          try {
                            await addDependency({ toTaskId: task.id, fromTaskId: newBlockedBy });
                            toast.success("Dependency added");
                            setNewBlockedBy("");
                            router.refresh();
                          } catch (e) {
                            toast.error(getErrorMessage(e));
                          }
                        });
                      }}
                    >
                      Add
                    </Button>
                  </div>
                ) : null}
              </div>

              <div className="grid gap-2">
                <div className="text-xs font-semibold tracking-wide text-muted-foreground">Blocks</div>
                {deps.blocks.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Not blocking other tasks.</div>
                ) : (
                  <div className="grid gap-2">
                    {deps.blocks.map((d) => (
                      <div key={d.toTaskId} className="flex items-center justify-between gap-2 rounded-2xl border bg-background/60 px-3 py-2">
                        <div className="min-w-0">
                          <a href={`/tasks?open=${d.toTask.id}`} className="truncate text-sm font-medium hover:underline">
                            {d.toTask.title}
                          </a>
                          <div className="mt-1">
                            <StatusPill status={d.toTask.status} />
                          </div>
                        </div>
                        {canEdit || canEditDependencies ? (
                          <Button
                            variant="secondary"
                            className="h-8 rounded-xl"
                            disabled={pending}
                            onClick={() => {
                              startTransition(async () => {
                                try {
                                  await removeDependency({ toTaskId: d.toTaskId, fromTaskId: task.id });
                                  toast.success("Dependency removed");
                                  router.refresh();
                                } catch (e) {
                                  toast.error(getErrorMessage(e));
                                }
                              });
                            }}
                          >
                            Remove
                          </Button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}

                {canEdit || canEditDependencies ? (
                  <div className="grid gap-2 rounded-2xl border bg-background/40 p-3">
                    <div className="text-xs text-muted-foreground">Add blocked task</div>
                    <Select value={newBlocks} onValueChange={setNewBlocks}>
                      <SelectTrigger className="rounded-2xl">
                        <SelectValue placeholder="Select a task" />
                      </SelectTrigger>
                      <SelectContent>
                        {candidates
                          .filter((c) => !deps.blocks.some((d) => d.toTaskId === c.id))
                          .slice(0, 200)
                          .map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.status.toLowerCase()}: {c.title}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Button
                      className="rounded-2xl"
                      disabled={pending || !newBlocks}
                      onClick={() => {
                        startTransition(async () => {
                          try {
                            await addDependency({ toTaskId: newBlocks, fromTaskId: task.id });
                            toast.success("Dependency added");
                            setNewBlocks("");
                            router.refresh();
                          } catch (e) {
                            toast.error(getErrorMessage(e));
                          }
                        });
                      }}
                    >
                      Add
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          </Card>

          <Card className="grain surface rounded-3xl border bg-card/80 p-5">
            <div className="text-sm font-semibold">Comments</div>
            <div className="mt-2 text-sm text-muted-foreground">Signal only. No noise.</div>
            <Separator className="my-4" />
            <div className="grid gap-2">
              {comments.length === 0 ? (
                <div className="text-sm text-muted-foreground">No comments yet.</div>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="rounded-2xl border bg-background/60 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium">{c.author.name}</div>
                        <div className="mt-0.5 font-mono text-xs text-muted-foreground">
                          {new Date(c.createdAt).toLocaleString()}
                        </div>
                      </div>
                      {canAdmin || c.author.id === currentUserId ? (
                        <Button
                          variant="ghost"
                          className="h-8 rounded-xl"
                          disabled={pending}
                          onClick={() => {
                            if (!window.confirm("Delete comment?")) return;
                            startTransition(async () => {
                              try {
                                await deleteComment({ commentId: c.id, taskId: task.id });
                                toast.success("Comment deleted");
                                router.refresh();
                              } catch (e) {
                                toast.error(getErrorMessage(e));
                              }
                            });
                          }}
                        >
                          Delete
                        </Button>
                      ) : null}
                    </div>
                    <div className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">{c.body}</div>
                  </div>
                ))
              )}
            </div>

            <Separator className="my-4" />
            <div className="grid gap-2">
              <Textarea
                className="rounded-2xl"
                placeholder="Add a comment..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={pending}
              />
              <Button
                className="rounded-2xl"
                disabled={pending}
                onClick={() => {
                  startTransition(async () => {
                    try {
                      await addComment({ taskId: task.id, body: comment });
                      toast.success("Comment added");
                      setComment("");
                      router.refresh();
                    } catch (e) {
                      toast.error(getErrorMessage(e));
                    }
                  });
                }}
              >
                Add comment
              </Button>
            </div>
          </Card>

          <Card className="grain surface rounded-3xl border bg-card/80 p-5">
            <div className="text-sm font-semibold">Activity</div>
            <div className="mt-2 text-sm text-muted-foreground">Audit trail for trust.</div>
            <Separator className="my-4" />
            <div className="grid gap-2">
              {activity.length === 0 ? (
                <div className="text-sm text-muted-foreground">No events yet.</div>
              ) : (
                activity.map((e) => (
                  <div key={e.id} className="rounded-2xl border bg-background/60 px-3 py-2">
                    <div className="text-sm">
                      <span className="font-medium">{e.action.toLowerCase()}</span> {e.entityType.toLowerCase()}
                    </div>
                    <div className="mt-0.5 font-mono text-xs text-muted-foreground">
                      {new Date(e.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
