import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/alert-dialog";
import { MoreHorizontal, Search, Shield } from "lucide-react";
import { useAdminUsers, useUpdateUser, useDeleteUser } from "@/hooks/use-admin";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import type { User } from "@/types";

export const AdminUsers = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
    const { data, isLoading } = useAdminUsers({ search: searchQuery });
    const updateUser = useUpdateUser();
    const deleteUser = useDeleteUser();

    const users = data?.users ?? [];

    const handleRoleChange = async (id: string, role: User['role']) => {
        const toastId = toast.loading("Updating user role...");
        try {
            await updateUser.mutateAsync({ id, data: { role } });
            toast.success(`User role updated to ${role}`, { id: toastId });
        } catch {
            toast.error("Failed to update role", { id: toastId });
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        const toastId = toast.loading("Deleting user...");
        try {
            await deleteUser.mutateAsync(deleteTarget._id);
            toast.success("User deleted successfully", { id: toastId });
            setDeleteTarget(null);
        } catch {
            toast.error("Failed to delete user", { id: toastId });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-display font-bold tracking-tight text-brand-blue">Users</h2>
                    <p className="text-muted-foreground">Manage user accounts and roles.</p>
                </div>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle>All Users</CardTitle>
                        <div className="flex items-center gap-2">
                            <div className="relative w-64">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input type="search" placeholder="Search users..." className="pl-9 h-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center space-x-4">
                                    <Skeleton className="h-12 w-12 rounded-full" />
                                    <div className="space-y-2"><Skeleton className="h-4 w-[250px]" /><Skeleton className="h-4 w-[200px]" /></div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Joined</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.length > 0 ? users.map((user: User) => (
                                    <TableRow key={user._id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                {user.profilePicture ? (
                                                    <img src={user.profilePicture} alt={user.displayName} className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-brand-orange/10 flex items-center justify-center text-xs font-bold text-brand-orange">
                                                        {user.displayName.charAt(0)}
                                                    </div>
                                                )}
                                                <span className="font-medium">{user.displayName}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{user.email}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                {user.role === 'admin' && <Shield className="w-3 h-3 text-brand-orange" />}
                                                <span className="capitalize">{user.role}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleRoleChange(user._id, 'admin')}>Make Admin</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleRoleChange(user._id, 'moderator')}>Make Moderator</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleRoleChange(user._id, 'user')}>Set as User</DropdownMenuItem>
                                                    <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => setDeleteTarget(user)}>Delete User</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={5} className="text-center h-24 text-muted-foreground">No users found.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <ConfirmDialog
                open={!!deleteTarget}
                onOpenChange={(o) => !o && setDeleteTarget(null)}
                title="Delete user?"
                description={`"${deleteTarget?.displayName}" and their data will be permanently removed. This cannot be undone.`}
                confirmLabel="Delete"
                destructive
                loading={deleteUser.isPending}
                onConfirm={handleDelete}
            />
        </div>
    );
};
