"use client";

import { useMemo, useState, useTransition } from "react";
import { createTask } from "@/app/(app)/actions/tasks";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TaskPriority, TaskStatus } from "@prisma/client";

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

export function CreateTaskDialog({
  projects,
  people,
  defaultProjectId,
}: {
  projects: { id: string; name: string }[];
  people: { id: string; name: string }[];
  defaultProjectId?: string;
}) {
  if (projects.length === 0) {
    return (
      <Button
        className="rounded-2xl"
        variant={defaultProjectId ? "secondary" : "default"}
        disabled
        title="Create a project first"
      >
        New task
      </Button>
    );
  }

  return (
    <CreateTaskDialogImpl
      projects={projects}
      people={people}
      defaultProjectId={defaultProjectId}
    />
  );
}

function CreateTaskDialogImpl({
  projects,
  people,
  defaultProjectId,
}: {
  projects: { id: string; name: string }[];
  people: { id: string; name: string }[];
  defaultProjectId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const defaultProject = defaultProjectId ?? projects[0]?.id ?? "";
  const defaultAssignee = "";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState(defaultProject);
  const [assigneeId, setAssigneeId] = useState(defaultAssignee);
  const [dueDate, setDueDate] = useState("");
  const [estimateHours, setEstimateHours] = useState("2");
  const [status, setStatus] = useState<TaskStatus>(TaskStatus.TODO);
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [error, setError] = useState<string | null>(null);

  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);

  // When opening, we reset inside onOpenChange (avoid setState-in-effect lint).

  function reset() {
    setTitle("");
    setDescription("");
    setAssigneeId(defaultAssignee);
    setDueDate("");
    setEstimateHours("2");
    setStatus(TaskStatus.TODO);
    setPriority(TaskPriority.MEDIUM);
    setError(null);
  }

  const normalizedAssigneeId = assigneeId === "__unassigned__" ? "" : assigneeId;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) setProjectId(defaultProject);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button className="rounded-2xl" variant={defaultProjectId ? "secondary" : "default"}>
          New task
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create task</DialogTitle>
          <DialogDescription>
            Tasks are the atomic unit. Keep them sharp.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="t-title">Title</Label>
            <Input
              id="t-title"
              placeholder="Ship dependency graph view"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="t-desc">Description</Label>
            <Textarea
              id="t-desc"
              placeholder="What is the exact outcome? Any constraints?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick a project" />
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
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger>
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
              <div className="text-xs text-muted-foreground">
                {assigneeId && assigneeId !== "__unassigned__" ? peopleById.get(assigneeId)?.name : "Unassigned"}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="t-due">Due date</Label>
              <Input
                id="t-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="t-est">Estimate (hours)</Label>
              <Input
                id="t-est"
                inputMode="decimal"
                value={estimateHours}
                onChange={(e) => setEstimateHours(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                <SelectTrigger>
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
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger>
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

          {error ? <div className="text-sm text-destructive">{error}</div> : null}

          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" className="rounded-2xl" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              className="rounded-2xl"
              disabled={pending}
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  try {
                    await createTask({
                      title,
                      description,
                      projectId,
                      assigneeId: normalizedAssigneeId,
                      dueDate,
                      estimateHours,
                      status,
                      priority,
                    });
                    setOpen(false);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Failed to create task");
                  }
                });
              }}
            >
              {pending ? "Creating..." : "Create"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
