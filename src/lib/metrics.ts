import { TaskStatus } from "@prisma/client";

export function isOpenStatus(status: TaskStatus) {
  return status !== TaskStatus.DONE;
}

export function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = (day + 6) % 7; // Monday-start
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - diff);
  return x;
}

export function formatWeekLabel(d: Date) {
  const x = new Date(d);
  const m = x.toLocaleString("en-US", { month: "short" });
  return `${m} ${x.getDate()}`;
}

export function median(nums: number[]) {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1]! + sorted[mid]!) / 2;
  return sorted[mid]!;
}
