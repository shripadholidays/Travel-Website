import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export const Logo = ({ className, light = false }: { className?: string; light?: boolean }) => {
    return (
        <Link to="/" className={cn("flex items-center gap-2 group", className)}>
            {/* Thrillophilia-style Hot Air Balloon Icon */}
            <div className="relative w-9 h-9 flex items-center justify-center">
                <svg
                    viewBox="0 0 32 32"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={cn(
                        "w-full h-full transition-transform duration-500 group-hover:-translate-y-1",
                        light ? "text-white" : "text-brand-orange"
                    )}
                >
                    {/* Balloon Body */}
                    <path d="M16 2 C9 2 4 7 4 12 C4 17 9 22 12 24 L14 26 L18 26 L20 24 C23 22 28 17 28 12 C28 7 23 2 16 2 Z" />
                    {/* Stripes on Balloon */}
                    <path d="M16 2 C16 2 20 7 20 12 C20 17 16 24 16 24" className="opacity-60" />
                    <path d="M16 2 C16 2 12 7 12 12 C12 17 16 24 16 24" className="opacity-60" />
                    <path d="M4 12 L28 12" className="opacity-30" />
                    {/* Basket */}
                    <rect x="13" y="27" width="6" height="4" rx="1" fill="currentColor" className="opacity-80" />
                </svg>
            </div>

            {/* Clean, Bold Brand Text */}
            <span className={cn(
                "font-sans font-extrabold text-2xl tracking-normal",
                light ? "text-white" : "text-brand-blue"
            )}>
                Wandeazy
            </span>
        </Link>
    );
};
