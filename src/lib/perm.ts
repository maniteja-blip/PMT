export type RoleLike = "ADMIN" | "MANAGER" | "MEMBER";

export function isManagerish(role: RoleLike) {
  return role === "ADMIN" || role === "MANAGER";
}

export function canDeleteProject(role: RoleLike) {
  return isManagerish(role);
}

export function canCreateProject(role: RoleLike) {
  return isManagerish(role);
}

export function canManageProject({
  role,
  userId,
  ownerId,
}: {
  role: RoleLike;
  userId: string;
  ownerId: string;
}) {
  return isManagerish(role) || userId === ownerId;
}

export function canDeleteTask(role: RoleLike) {
  return isManagerish(role);
}

export function canEditAnyTask(role: RoleLike) {
  return isManagerish(role);
}
