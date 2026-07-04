import { Outlet, ScrollRestoration } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const MainLayout = () => {
    return (
        <div className="flex flex-col min-h-screen relative w-full">
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200] focus:rounded-lg focus:bg-brand-orange focus:px-4 focus:py-2 focus:text-white"
            >
                Skip to content
            </a>
            <Navbar />
            <main id="main-content" className="flex-grow w-full">
                <Outlet />
            </main>
            <Footer />
            <ScrollRestoration />
        </div>
    );
};
