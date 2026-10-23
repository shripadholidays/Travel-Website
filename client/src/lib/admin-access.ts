import type { Permission, User } from "@/types";

// Mirrors server/src/config/permissions.js. The server sends each user's permissions and
// enforces them; this copy is only the fallback for menus before the profile has loaded.
const ROLE_PERMISSIONS: Record<User["role"], Permission[]> = {
    user: [],
    moderator: ["articles.review"],
    support: ["dashboard.view", "bookings.manage", "community.manage"],
    editor: ["dashboard.view", "catalog.manage", "content.manage", "articles.review"],
    manager: [
        "dashboard.view", "catalog.manage", "content.manage", "bookings.manage", "finance.view",
        "marketing.manage", "community.manage", "articles.review", "activity.view",
    ],
    admin: [
        "dashboard.view", "catalog.manage", "content.manage", "bookings.manage", "finance.view",
        "marketing.manage", "community.manage", "articles.review", "users.manage", "settings.manage", "activity.view",
    ],
};

export const ROLE_LABELS: Record<User["role"], string> = {
    user: "Traveller",
    moderator: "Article moderator",
    support: "Customer support",
    editor: "Catalog editor",
    manager: "Manager",
    admin: "Administrator",
};

type Who = Pick<User, "role" | "permissions"> | null | undefined;

export function permissionsOf(user: Who): Permission[] {
    if (!user) return [];
    return user.permissions ?? ROLE_PERMISSIONS[user.role] ?? [];
}

export const hasPermission = (user: Who, permission: Permission) => permissionsOf(user).includes(permission);

/** Anyone who has something to do in the admin area. */
export const isStaff = (user: Who) => permissionsOf(user).length > 0;

export const roleLabel = (user: Pick<User, "role" | "roleLabel"> | null | undefined) =>
    user ? user.roleLabel ?? ROLE_LABELS[user.role] ?? user.role : "";

// Which permission opens each admin page (longest match wins, so /admin/tours/new uses /admin/tours)
const PATH_PERMISSIONS: [string, Permission[]][] = [
    ["/admin/dashboard", ["dashboard.view"]],
    ["/admin/tours", ["catalog.manage"]],
    ["/admin/destinations", ["catalog.manage"]],
    ["/admin/collections", ["catalog.manage"]],
    ["/admin/homepage", ["content.manage"]],
    ["/admin/about", ["content.manage"]],
    ["/admin/faq", ["content.manage"]],
    ["/admin/content", ["content.manage"]],
    ["/admin/bookings", ["bookings.manage"]],
    ["/admin/travel-orders", ["bookings.manage"]],
    ["/admin/payments", ["finance.view"]],
    ["/admin/coupons", ["marketing.manage"]],
    ["/admin/subscribers", ["marketing.manage"]],
    ["/admin/reviews", ["community.manage"]],
    ["/admin/inquiries", ["community.manage"]],
    ["/admin/blog", ["articles.review"]],
    ["/admin/write-article", ["articles.review"]],
    ["/admin/users", ["users.manage"]],
    ["/admin/settings", ["settings.manage"]],
    ["/admin/activity", ["activity.view"]],
];

export function canOpenAdminPath(user: Who, path: string) {
    const match = PATH_PERMISSIONS
        .filter(([p]) => path === p || path.startsWith(`${p}/`))
        .sort((a, b) => b[0].length - a[0].length)[0];
    if (!match) return isStaff(user);
    return match[1].some((p) => hasPermission(user, p));
}

/** Where a staff member lands in the admin area. */
export function adminHome(user: Who) {
    if (hasPermission(user, "dashboard.view")) return "/admin/dashboard";
    const first = PATH_PERMISSIONS.find(([path]) => canOpenAdminPath(user, path));
    return first ? first[0] : "/dashboard";
}
