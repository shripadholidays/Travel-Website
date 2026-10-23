import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { api } from "@/services/api";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/PageTitle";
import { useAuth } from "@/context/AuthContext";

export const VerifyEmailPage = () => {
    const { token } = useParams<{ token: string }>();
    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [message, setMessage] = useState("");
    const { user, refreshUser } = useAuth();

    useEffect(() => {
        if (!token) { setStatus("error"); setMessage("Invalid verification link."); return; }
        api.get(`/auth/verify-email/${token}`)
            .then(() => { setStatus("success"); setMessage("Your email has been verified. You're all set!"); refreshUser(); })
            .catch((err) => { setStatus("error"); setMessage((err as Error).message || "Verification link is invalid or has expired."); });
    }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
            <PageTitle title="Verify Email" noIndex />
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-sm text-center space-y-6"
            >
                {status === "loading" && (
                    <>
                        <Loader2 className="w-16 h-16 text-brand-orange animate-spin mx-auto" />
                        <h1 className="text-2xl font-display font-bold">Verifying your email…</h1>
                    </>
                )}
                {status === "success" && (
                    <>
                        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
                        <h1 className="text-2xl font-display font-bold">Email verified!</h1>
                        <p className="text-muted-foreground">{message}</p>
                        <Button variant="brand" className="rounded-xl" asChild>
                            <Link to={user ? "/dashboard" : "/login"}>{user ? "Go to dashboard" : "Sign in"}</Link>
                        </Button>
                    </>
                )}
                {status === "error" && (
                    <>
                        <XCircle className="w-16 h-16 text-red-500 mx-auto" />
                        <h1 className="text-2xl font-display font-bold">Verification failed</h1>
                        <p className="text-muted-foreground">{message}</p>
                        <Button variant="outline" className="rounded-xl" asChild>
                            <Link to={user ? "/dashboard" : "/login"}>{user ? "Send a new link from your dashboard" : "Back to sign in"}</Link>
                        </Button>
                    </>
                )}
            </motion.div>
        </div>
    );
};
