import { describe, expect, it } from "vitest";
import { adminHome, canOpenAdminPath, hasPermission, isStaff } from "./admin-access";

describe("admin access", () => {
    it("opens each page only for the roles that work on it", () => {
        const editor = { role: "editor" as const };
        expect(canOpenAdminPath(editor, "/admin/tours/new")).toBe(true);
        expect(canOpenAdminPath(editor, "/admin/tours/abc/edit")).toBe(true);
        expect(canOpenAdminPath(editor, "/admin/bookings")).toBe(false);
        expect(canOpenAdminPath(editor, "/admin/users")).toBe(false);
        expect(canOpenAdminPath({ role: "support" }, "/admin/bookings")).toBe(true);
        expect(canOpenAdminPath({ role: "moderator" }, "/admin/write-article")).toBe(true);
        expect(canOpenAdminPath({ role: "moderator" }, "/admin/dashboard")).toBe(false);
    });

    it("prefers the permissions the server sent", () => {
        const user = { role: "user" as const, permissions: ["catalog.manage" as const] };
        expect(hasPermission(user, "catalog.manage")).toBe(true);
        expect(isStaff({ role: "user" })).toBe(false);
    });

    it("lands staff on a page they can open", () => {
        expect(adminHome({ role: "admin" })).toBe("/admin/dashboard");
        expect(adminHome({ role: "moderator" })).toBe("/admin/blog");
        expect(adminHome({ role: "user" })).toBe("/dashboard");
    });
});
