import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().trim().min(2, "Project name is too short"),
  description: z.string().trim().max(4000).optional().or(z.literal("")),
  ownerId: z.string().trim().min(1),
  targetDate: z.string().optional().or(z.literal("")),
});

export const updateProjectSchema = createProjectSchema.extend({
  id: z.string().trim().min(1),
});

export const createTaskSchema = z.object({
  title: z.string().trim().min(2, "Task title is too short"),
  description: z.string().trim().max(8000).optional().or(z.literal("")),
  projectId: z.string().trim().min(1),
  assigneeId: z.string().optional().or(z.literal("")),
  dueDate: z.string().optional().or(z.literal("")),
  estimateHours: z
    .string()
    .optional()
    .transform((x) => (x && x.length ? Number(x) : 2))
    .pipe(z.number().finite().min(0.25).max(200)),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional().default("MEDIUM"),
  status: z.enum(["BACKLOG", "TODO", "IN_PROGRESS", "BLOCKED", "DONE"]).optional().default("TODO"),
});

export const updateTaskSchema = createTaskSchema.extend({
  id: z.string().trim().min(1),
});

export const updateTaskStatusSchema = z.object({
  id: z.string().trim().min(1),
  status: z.enum(["BACKLOG", "TODO", "IN_PROGRESS", "BLOCKED", "DONE"]),
});
