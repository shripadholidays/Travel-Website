import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { api } from "@/services/api";
import { PageTitle } from "@/components/PageTitle";

export const ForgotPasswordPage = () => {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) {
            setError("Please enter your email address.");
            return;
        }
        setIsLoading(true);
        setError("");
        try {
            await api.post("/auth/forgot-password", { email: email.trim() });
            setSent(true);
        } catch (err) {
            setError((err as Error).message || "Something went wrong. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
            <PageTitle title="Forgot Password" />
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-sm space-y-8"
            >
                <div>
                    <Link to="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
                        <ArrowLeft className="w-4 h-4" /> Back to sign in
                    </Link>
                    <h1 className="text-3xl font-display font-bold">Forgot password?</h1>
                    <p className="text-muted-foreground mt-2">
                        No worries — enter your email and we'll send you a reset link.
                    </p>
                </div>

                {sent ? (
                    <div className="flex flex-col items-center gap-4 py-8 text-center">
                        <CheckCircle2 className="w-16 h-16 text-green-500" />
                        <h2 className="text-xl font-bold">Check your email</h2>
                        <p className="text-muted-foreground text-sm max-w-xs">
                            If an account with <strong>{email}</strong> exists, we've sent a password reset link. Check your inbox (and spam folder).
                        </p>
                        <Link to="/login">
                            <Button variant="outline" className="mt-2 rounded-xl">Back to sign in</Button>
                        </Link>
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
                                <Label htmlFor="email">Email address</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="you@email.com"
                                        className="pl-10 h-11 rounded-xl"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        autoComplete="email"
                                        required
                                    />
                                </div>
                            </div>
                            <Button type="submit" variant="brand" className="w-full h-11 rounded-xl" disabled={isLoading}>
                                {isLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Sending…</> : "Send reset link"}
                            </Button>
                        </form>
                    </>
                )}
            </motion.div>
        </div>
    );
};
