import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useReturnAfterAuth } from "@/hooks/use-return-after-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { Image } from "@/components/ui/image";
import { PageTitle } from "@/components/PageTitle";

declare global {
    interface Window {
        google?: {
            accounts: {
                id: {
                    initialize: (config: Record<string, unknown>) => void;
                    renderButton: (element: HTMLElement, config: Record<string, unknown>) => void;
                };
            };
        };
    }
}

export const LoginPage = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const { loginWithGoogle, loginWithEmail } = useAuth();
    const googleBtnRef = useRef<HTMLDivElement>(null);

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !password) {
            setError("Please enter your email and password.");
            return;
        }
        setIsLoading(true);
        setError("");
        try {
            await loginWithEmail(email.trim(), password);
        } catch (err) {
            setError((err as Error).message || "Login failed. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    // Once signed in, return to where the visitor came from (e.g. the booking they started)
    useReturnAfterAuth();

    // Initialize Google Sign-In
    useEffect(() => {
        const clientId = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID;
        if (!clientId) return;

        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => {
            window.google?.accounts.id.initialize({
                client_id: clientId,
                callback: handleGoogleResponse,
                auto_select: false,
            });
            if (googleBtnRef.current) {
                window.google?.accounts.id.renderButton(googleBtnRef.current, {
                    theme: 'outline',
                    size: 'large',
                    width: '100%',
                    text: 'signin_with',
                    shape: 'pill',
                });
            }
        };
        document.head.appendChild(script);
        return () => { script.remove(); };
    }, []);

    const handleGoogleResponse = async (response: { credential: string }) => {
        setIsLoading(true);
        setError("");
        try {
            await loginWithGoogle(response.credential);
        } catch (err) {
            setError((err as Error).message || "Login failed. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen grid lg:grid-cols-2">
            <PageTitle title="Login" />
            {/* Left: Image Section (Hidden on mobile) */}
            <div className="hidden lg:flex relative bg-black">
                <Image
                    src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=1200"
                    alt="Travel Adventure"
                    className="absolute inset-0 w-full h-full object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                <div className="relative z-10 flex flex-col justify-end p-16 text-white h-full w-full">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <h1 className="text-5xl font-display font-bold mb-6 leading-tight">
                            Your next journey <br /> begins here.
                        </h1>
                        <p className="text-lg text-white/80 max-w-md">
                            Join thousands of travelers exploring the world's most breathtaking destinations with Wandeazy.
                        </p>
                    </motion.div>
                </div>
            </div>

            {/* Right: Form Section */}
            <div className="flex items-center justify-center p-8 bg-background">
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="w-full max-w-sm space-y-8"
                >
                    <div className="text-center lg:text-left">
                        <h2 className="text-3xl font-display font-bold tracking-tight">Welcome back</h2>
                        <p className="text-muted-foreground mt-2">Sign in to continue your journey</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-200">
                            {error}
                        </div>
                    )}

                    {/* Email / password form */}
                    <form onSubmit={handleEmailLogin} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="email">Email</Label>
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
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">Password</Label>
                                <Link to="/forgot-password" className="text-xs text-brand-orange hover:underline font-medium">
                                    Forgot password?
                                </Link>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    className="pl-10 pr-10 h-11 rounded-xl"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    autoComplete="current-password"
                                    required
                                />
                                <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={showPassword ? "Hide password" : "Show password"}>
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                        <Button type="submit" variant="brand" className="w-full h-11 rounded-xl" disabled={isLoading}>
                            {isLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Signing in…</> : "Sign In"}
                        </Button>
                    </form>

                    {/* Divider */}
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-3 text-muted-foreground">Or continue with</span>
                        </div>
                    </div>

                    {/* Google Sign-In Button (rendered by Google SDK) */}
                    <div ref={googleBtnRef} className="flex justify-center" />

                    <div className="text-center text-sm">
                        <span className="text-muted-foreground">Don't have an account? </span>
                        <Link to="/register" className="font-semibold text-brand-orange hover:underline">
                            Sign up for free
                        </Link>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};
