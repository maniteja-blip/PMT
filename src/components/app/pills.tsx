import { Badge } from "@/components/ui/badge";
import {
  HealthStatus,
  TaskPriority,
  TaskStatus,
} from "@prisma/client";

export function HealthPill({ health }: { health: HealthStatus }) {
  if (health === HealthStatus.AT_RISK) return <Badge variant="destructive">at risk</Badge>;
  if (health === HealthStatus.OFF_TRACK) return <Badge variant="destructive">off track</Badge>;
  return <Badge variant="secondary">on track</Badge>;
}

export function StatusPill({ status }: { status: TaskStatus }) {
  if (status === TaskStatus.BLOCKED) return <Badge variant="destructive">blocked</Badge>;
  if (status === TaskStatus.DONE) return <Badge>done</Badge>;
  if (status === TaskStatus.IN_PROGRESS) return <Badge variant="secondary">in progress</Badge>;
  if (status === TaskStatus.BACKLOG) return <Badge variant="outline">backlog</Badge>;
  return <Badge variant="secondary">todo</Badge>;
}

export function PriorityPill({ priority }: { priority: TaskPriority }) {
  if (priority === TaskPriority.URGENT) return <Badge variant="destructive">urgent</Badge>;
  if (priority === TaskPriority.HIGH) return <Badge variant="secondary">high</Badge>;
  if (priority === TaskPriority.LOW) return <Badge variant="outline">low</Badge>;
  return <Badge variant="secondary">medium</Badge>;
}
