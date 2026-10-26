import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock, Eye, EyeOff, CheckCircle2, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { api } from "@/services/api";
import { PageTitle } from "@/components/PageTitle";

export const ResetPasswordPage = () => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [showPw, setShowPw] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }
        if (password !== confirm) {
            setError("Passwords do not match.");
            return;
        }
        setIsLoading(true);
        setError("");
        try {
            await api.post(`/auth/reset-password/${token}`, { password });
            setDone(true);
            setTimeout(() => navigate("/login", { replace: true }), 3000);
        } catch (err) {
            setError((err as Error).message || "Reset link is invalid or has expired.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
            <PageTitle title="Reset Password" noIndex />
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-sm space-y-8"
            >
                <div>
                    <Link to="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
                        <ArrowLeft className="w-4 h-4" /> Back to sign in
                    </Link>
                    <h1 className="text-3xl font-display font-bold">Set new password</h1>
                    <p className="text-muted-foreground mt-2">Choose a strong password for your account.</p>
                </div>

                {done ? (
                    <div className="flex flex-col items-center gap-4 py-8 text-center">
                        <CheckCircle2 className="w-16 h-16 text-green-500" />
                        <h2 className="text-xl font-bold">Password updated!</h2>
                        <p className="text-muted-foreground text-sm">Redirecting you to sign in…</p>
                    </div>
                ) : (
                    <>
                        {error && (
                            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-200">
                                {error}
                            </div>
                        )}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="password">New password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        id="password"
                                        type={showPw ? "text" : "password"}
                                        placeholder="At least 6 characters"
                                        className="pl-10 pr-10 h-11 rounded-xl"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        autoComplete="new-password"
                                        required
                                    />
                                    <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={showPw ? "Hide password" : "Show password"}>
                                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="confirm">Confirm new password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        id="confirm"
                                        type={showPw ? "text" : "password"}
                                        placeholder="Same password again"
                                        className="pl-10 h-11 rounded-xl"
                                        value={confirm}
                                        onChange={(e) => setConfirm(e.target.value)}
                                        autoComplete="new-password"
                                        required
                                    />
                                </div>
                            </div>
                            <Button type="submit" variant="brand" className="w-full h-11 rounded-xl" disabled={isLoading}>
                                {isLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Updating…</> : "Update password"}
                            </Button>
                        </form>
                    </>
                )}
            </motion.div>
        </div>
    );
};
