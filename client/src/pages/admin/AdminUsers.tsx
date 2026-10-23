import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { MoreHorizontal, Shield, Users, Loader2, Ban, RotateCcw, Trash2, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, PageHeader, SearchField, StatusPill, StatusTabs, TableFooter, type Tone } from "@/components/admin/AdminUI";
import { useAdminUsers, useUpdateUser, useDeleteUser, useRoles } from "@/hooks/use-admin";
import { useDebounced } from "@/hooks/use-debounced";
import { useAuth } from "@/context/AuthContext";
import { ROLE_LABELS } from "@/lib/admin-access";
import { cn } from "@/lib/utils";
import type { User } from "@/types";

const ROLE_TONE: Record<User["role"], Tone> = {
    user: "slate", moderator: "blue", support: "blue", editor: "orange", manager: "orange", admin: "red",
};

const PERMISSION_LABELS: Record<string, string> = {
    "dashboard.view": "Dashboard",
    "catalog.manage": "Tours, destinations & collections",
    "content.manage": "Homepage, About & FAQ",
    "bookings.manage": "Bookings and flight & hotel orders",
    "finance.view": "Payments & revenue",
    "marketing.manage": "Coupons & subscribers",
    "community.manage": "Inquiries & reviews",
    "articles.review": "Review & publish articles",
    "users.manage": "Users & staff roles",
    "settings.manage": "Site settings & services",
    "activity.view": "Activity log",
};

export const AdminUsers = () => {
    const { user: me } = useAuth();
    const [params, setParams] = useSearchParams();
    const role = params.get("role") ?? "all";
    const page = Number(params.get("page") || 1);
    const [search, setSearch] = useState(params.get("q") ?? "");
    const debounced = useDebounced(search, 300);
    const setParam = (key: string, value: string) => {
        const next = new URLSearchParams(params);
        if (value && value !== "all" && !(key === "page" && value === "1")) next.set(key, value);
        else next.delete(key);
        if (key !== "page") next.delete("page");
        setParams(next, { replace: true });
    };

    const { data, isLoading, isFetching } = useAdminUsers({ search: debounced, role, page });
    const { data: rolesData } = useRoles();
    const updateUser = useUpdateUser();
    const deleteUser = useDeleteUser();

    const [roleTarget, setRoleTarget] = useState<User | null>(null);
    const [newRole, setNewRole] = useState<User["role"]>("user");
    const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
    const [suspendTarget, setSuspendTarget] = useState<User | null>(null);

    const users = data?.users ?? [];
    const counts = data?.roleCounts ?? {};
    const total = Object.values(counts).reduce((s, n) => s + n, 0);
    const staffCount = total - (counts.user ?? 0);
    const roles = rolesData?.roles ?? [];

    const openRole = (u: User) => { setRoleTarget(u); setNewRole(u.role); };

    const saveRole = async () => {
        if (!roleTarget) return;
        try {
            await updateUser.mutateAsync({ id: roleTarget._id, data: { role: newRole } });
            toast.success(`${roleTarget.displayName}'s role is now ${ROLE_LABELS[newRole]}.`);
            setRoleTarget(null);
        } catch (err) {
            toast.error((err as Error).message || "Could not change the role");
        }
    };

    const setSuspended = async (u: User, isSuspended: boolean) => {
        try {
            await updateUser.mutateAsync({ id: u._id, data: { isSuspended } });
            toast.success(isSuspended ? `${u.displayName} can no longer sign in.` : `${u.displayName} can sign in again.`);
            setSuspendTarget(null);
        } catch (err) {
            toast.error((err as Error).message || "Could not update the account");
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await deleteUser.mutateAsync(deleteTarget._id);
            toast.success("Account deleted");
        } catch (err) {
            toast.error((err as Error).message || "Failed to delete the account", { duration: 8000 });
        }
        setDeleteTarget(null);
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Users & Roles"
                description="Traveller accounts and your team. Give each staff member only the role their work needs."
            />

            {/* What each role can do */}
            {roles.length > 0 && (
                <details className="group rounded-2xl border border-slate-200 bg-white">
                    <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3 text-sm font-semibold text-brand-blue">
                        <Shield className="w-4 h-4 text-brand-orange" /> What each role can do
                        <span className="ml-auto text-xs font-normal text-muted-foreground group-open:hidden">Show</span>
                        <span className="ml-auto text-xs font-normal text-muted-foreground hidden group-open:inline">Hide</span>
                    </summary>
                    <div className="grid gap-3 border-t border-slate-100 p-5 sm:grid-cols-2 xl:grid-cols-3">
                        {roles.filter((r) => r.id !== "user").map((r) => (
                            <div key={r.id} className="rounded-xl border border-slate-100 p-4">
                                <StatusPill tone={ROLE_TONE[r.id]}>{r.label}</StatusPill>
                                <p className="mt-2 text-sm text-slate-600">{r.description}</p>
                                <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                                    {r.permissions.map((p) => <li key={p}>• {PERMISSION_LABELS[p] ?? p}</li>)}
                                </ul>
                            </div>
                        ))}
                    </div>
                </details>
            )}

            <Card>
                <CardHeader className="pb-3 space-y-4">
                    <StatusTabs
                        value={role}
                        onChange={(v) => setParam("role", v)}
                        label="Filter by role"
                        options={[
                            { id: "all", label: "Everyone", count: total },
                            { id: "staff", label: "All staff", count: staffCount },
                            { id: "user", label: "Travellers", count: counts.user ?? 0 },
                            ...(["admin", "manager", "editor", "support", "moderator"] as const).map((r) => ({ id: r, label: ROLE_LABELS[r], count: counts[r] ?? 0 })),
                        ]}
                    />
                    <div className="flex items-center gap-3">
                        <SearchField value={search} onChange={(v) => { setSearch(v); setParam("q", v); }} placeholder="Name or email…" className="sm:w-80" />
                        {isFetching && !isLoading && <span className="text-xs text-muted-foreground">Updating…</span>}
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                    ) : users.length === 0 ? (
                        <EmptyState icon={Users} title="No accounts match" description="Try another search or role." />
                    ) : (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Person</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead className="hidden md:table-cell">Bookings</TableHead>
                                        <TableHead className="hidden md:table-cell">Joined</TableHead>
                                        <TableHead className="text-right"><span className="sr-only">Actions</span></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.map((u) => {
                                        const isMe = u._id === me?._id;
                                        return (
                                            <TableRow key={u._id} className={cn(u.isSuspended && "opacity-60")}>
                                                <TableCell>
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        {u.profilePicture ? (
                                                            <img src={u.profilePicture} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
                                                        ) : (
                                                            <div className="w-9 h-9 rounded-full bg-brand-orange/10 flex items-center justify-center text-xs font-bold text-brand-orange shrink-0">
                                                                {u.displayName.charAt(0).toUpperCase()}
                                                            </div>
                                                        )}
                                                        <div className="min-w-0">
                                                            <p className="font-medium truncate">{u.displayName}{isMe && <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>}</p>
                                                            <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-wrap gap-1">
                                                        <StatusPill tone={ROLE_TONE[u.role]}>{u.roleLabel ?? ROLE_LABELS[u.role]}</StatusPill>
                                                        {u.isSuspended && <StatusPill tone="red">Suspended</StatusPill>}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="hidden md:table-cell tabular-nums">{u.bookingCount ?? 0}</TableCell>
                                                <TableCell className="hidden md:table-cell text-muted-foreground whitespace-nowrap">{format(new Date(u.createdAt), "d MMM yyyy")}</TableCell>
                                                <TableCell className="text-right">
                                                    {isMe ? (
                                                        <span className="text-xs text-muted-foreground">—</span>
                                                    ) : (
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for ${u.displayName}`}><MoreHorizontal className="w-4 h-4" /></Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="w-52">
                                                                <DropdownMenuItem onClick={() => openRole(u)}><UserCog className="w-4 h-4 mr-2" /> Change role…</DropdownMenuItem>
                                                                <DropdownMenuItem asChild><a href={`mailto:${u.email}`}>Email</a></DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                {u.isSuspended ? (
                                                                    <DropdownMenuItem onClick={() => setSuspended(u, false)}><RotateCcw className="w-4 h-4 mr-2" /> Reactivate</DropdownMenuItem>
                                                                ) : (
                                                                    <DropdownMenuItem onClick={() => setSuspendTarget(u)}><Ban className="w-4 h-4 mr-2" /> Suspend</DropdownMenuItem>
                                                                )}
                                                                <DropdownMenuItem className="text-red-600 focus:text-red-600" disabled={(u.bookingCount ?? 0) > 0} onClick={() => setDeleteTarget(u)}>
                                                                    <Trash2 className="w-4 h-4 mr-2" /> {(u.bookingCount ?? 0) > 0 ? "Has bookings (suspend instead)" : "Delete account"}
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                            <TableFooter pagination={data?.pagination} onPageChange={(p) => setParam("page", String(p))} noun="accounts" />
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Change role */}
            <Dialog open={!!roleTarget} onOpenChange={(o) => !o && setRoleTarget(null)}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Change role</DialogTitle>
                        <DialogDescription>{roleTarget?.displayName} · {roleTarget?.email}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2" role="radiogroup" aria-label="Role">
                        {roles.map((r) => (
                            <label key={r.id} className={cn(
                                "flex cursor-pointer gap-3 rounded-xl border p-3 transition-colors",
                                newRole === r.id ? "border-brand-orange bg-brand-orange/[0.04]" : "border-slate-200 hover:border-slate-300",
                            )}>
                                <input type="radio" name="role" value={r.id} checked={newRole === r.id} onChange={() => setNewRole(r.id)} className="mt-1 accent-brand-orange" />
                                <span>
                                    <span className="block text-sm font-semibold text-slate-800">{r.label}</span>
                                    <span className="block text-xs text-muted-foreground">{r.description}</span>
                                </span>
                            </label>
                        ))}
                    </div>
                    {newRole === "admin" && roleTarget?.role !== "admin" && (
                        <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">Administrators can change everyone's role, including yours, and all site settings.</p>
                    )}
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setRoleTarget(null)}>Cancel</Button>
                        <Button onClick={saveRole} disabled={updateUser.isPending || newRole === roleTarget?.role} className="bg-brand-orange hover:bg-brand-orange/90 gap-1.5">
                            {updateUser.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Save role
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={!!suspendTarget}
                onOpenChange={(o) => !o && setSuspendTarget(null)}
                title={`Suspend ${suspendTarget?.displayName}?`}
                description="They are signed out and can't sign in or book until you reactivate the account. Their bookings and history are kept."
                confirmLabel="Suspend"
                destructive
                loading={updateUser.isPending}
                onConfirm={() => suspendTarget && setSuspended(suspendTarget, true)}
            />
            <ConfirmDialog
                open={!!deleteTarget}
                onOpenChange={(o) => !o && setDeleteTarget(null)}
                title="Delete account?"
                description={`"${deleteTarget?.displayName}" will be permanently removed. This cannot be undone.`}
                confirmLabel="Delete"
                destructive
                loading={deleteUser.isPending}
                onConfirm={handleDelete}
            />
        </div>
    );
};
