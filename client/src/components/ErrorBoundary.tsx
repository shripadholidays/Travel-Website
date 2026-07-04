import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        if (import.meta.env.DEV) {
            console.error("ErrorBoundary caught:", error, errorInfo);
        }
        // In production, errors could be forwarded to a monitoring service here.
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
                    <div className="text-center max-w-md">
                        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle className="w-10 h-10 text-red-500" />
                        </div>

                        <h1 className="text-3xl font-display font-bold text-slate-900 mb-3">
                            Something went wrong
                        </h1>
                        <p className="text-muted-foreground text-lg mb-2">
                            An unexpected error occurred. We apologize for the inconvenience.
                        </p>

                        {/* Only surface raw error details in development. */}
                        {import.meta.env.DEV && this.state.error && (
                            <pre className="text-xs text-left bg-slate-50 border rounded-lg p-4 mb-6 overflow-auto max-h-32 text-red-600">
                                {this.state.error.message}
                            </pre>
                        )}

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                            <Button onClick={this.handleReset} className="bg-brand-orange hover:bg-brand-orange/90 gap-2">
                                <RefreshCw className="w-4 h-4" />
                                Try Again
                            </Button>
                            <Button variant="outline" className="gap-2" onClick={() => window.location.href = "/"}>
                                <Home className="w-4 h-4" />
                                Go Home
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
