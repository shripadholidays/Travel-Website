import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MapPin, Home, Search } from "lucide-react";
import { PageTitle } from "@/components/PageTitle";

export const NotFound = () => {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
            <PageTitle title="Page Not Found" noIndex />
            <div className="text-center max-w-md">
                <div className="relative mb-8">
                    <span className="text-[10rem] font-display font-bold text-brand-orange/10 leading-none select-none">404</span>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <MapPin className="w-16 h-16 text-brand-orange" />
                    </div>
                </div>

                <h1 className="text-3xl font-display font-bold text-slate-900 mb-3">
                    Lost your way?
                </h1>
                <p className="text-muted-foreground text-lg mb-8">
                    The page you're looking for doesn't exist or has been moved. Let's get you back on track.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Button className="bg-brand-orange hover:bg-brand-orange/90 gap-2" asChild>
                        <Link to="/">
                            <Home className="w-4 h-4" />
                            Back to Home
                        </Link>
                    </Button>
                    <Button variant="outline" className="gap-2" asChild>
                        <Link to="/tours">
                            <Search className="w-4 h-4" />
                            Browse Tours
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
};
