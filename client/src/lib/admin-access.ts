import type { User } from "@/types";

// Moderators review and write articles; everything else in the admin area is admin-only
const MODERATOR_PATHS = ["/admin/blog", "/admin/write-article"];

export function canOpenAdminPath(user: Pick<User, "role"> | null | undefined, path: string) {
    if (user?.role === "admin") return true;
    if (user?.role === "moderator") return MODERATOR_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
    return false;
}

/** Where a staff member lands in the admin area. */
export const adminHome = (user: Pick<User, "role"> | null | undefined) =>
    user?.role === "admin" ? "/admin/dashboard" : "/admin/blog";
