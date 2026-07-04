import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import { MainLayout } from '@/layouts/MainLayout';
import { Home } from '@/pages/Home';
import { SearchPage } from '@/pages/SearchPage';
import { CollectionsPage } from '@/pages/Collections';
import { CollectionDetails } from '@/pages/CollectionDetails';
import { DestinationsPage } from '@/pages/Destinations';
import { BlogPage } from '@/pages/Blog';
import { LoginPage } from '@/pages/Login';
import { RegisterPage } from '@/pages/Register';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DestinationDetails } from '@/pages/DestinationDetails';
import { BlogDetails } from '@/pages/BlogDetails';
import { NotFound } from '@/pages/NotFound';
import { AboutPage } from '@/pages/About';
import { ContactPage } from '@/pages/Contact';
import { PrivacyPage } from '@/pages/Privacy';
import { TermsPage } from '@/pages/Terms';
import { FAQPage } from '@/pages/FAQ';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ProtectedAdminRoute } from '@/components/ProtectedAdminRoute';
import { Spinner } from '@/components/ui/spinner';
import { AuthProvider } from '@/context/AuthContext';
import { CurrencyProvider } from '@/context/CurrencyContext';
import { Toaster } from 'sonner';

// Lazily loaded — heavy deps (map, Stripe) or admin-only
const TourDetails = lazy(() => import('@/pages/TourDetails').then((m) => ({ default: m.TourDetails })));
const Dashboard = lazy(() => import('@/pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const BookingPage = lazy(() => import('@/pages/BookingPage').then((m) => ({ default: m.BookingPage })));
const WriteArticle = lazy(() => import('@/pages/WriteArticle').then((m) => ({ default: m.WriteArticle })));
const AdminLayout = lazy(() => import('@/layouts/AdminLayout').then((m) => ({ default: m.AdminLayout })));

// Admin pages
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard })));
const AdminSettings = lazy(() => import('@/pages/admin/AdminSettings').then((m) => ({ default: m.AdminSettings })));
const AdminTours = lazy(() => import('@/pages/admin/AdminTours').then((m) => ({ default: m.AdminTours })));
const AdminTourForm = lazy(() => import('@/pages/admin/AdminTourForm').then((m) => ({ default: m.AdminTourForm })));
const AdminBookings = lazy(() => import('@/pages/admin/AdminBookings').then((m) => ({ default: m.AdminBookings })));
const AdminUsers = lazy(() => import('@/pages/admin/AdminUsers').then((m) => ({ default: m.AdminUsers })));
const AdminDestinations = lazy(() => import('@/pages/admin/AdminDestinations').then((m) => ({ default: m.AdminDestinations })));
const AdminBlog = lazy(() => import('@/pages/admin/AdminBlog').then((m) => ({ default: m.AdminBlog })));
const AdminContent = lazy(() => import('@/pages/admin/AdminContent').then((m) => ({ default: m.AdminContent })));
const AdminHomepage = lazy(() => import('@/pages/admin/AdminHomepage').then((m) => ({ default: m.AdminHomepage })));
const AdminAbout = lazy(() => import('@/pages/admin/AdminAbout').then((m) => ({ default: m.AdminAbout })));
const AdminFAQ = lazy(() => import('@/pages/admin/AdminFAQ').then((m) => ({ default: m.AdminFAQ })));
const AdminCollections = lazy(() => import('@/pages/admin/AdminCollections').then((m) => ({ default: m.AdminCollections })));
const AdminInquiries = lazy(() => import('@/pages/admin/AdminInquiries').then((m) => ({ default: m.AdminInquiries })));
const AdminSubscribers = lazy(() => import('@/pages/admin/AdminSubscribers').then((m) => ({ default: m.AdminSubscribers })));
const AdminReviews = lazy(() => import('@/pages/admin/AdminReviews').then((m) => ({ default: m.AdminReviews })));
const AdminPayments = lazy(() => import('@/pages/admin/AdminPayments').then((m) => ({ default: m.AdminPayments })));

const PageFallback = () => (
    <div className="min-h-screen flex items-center justify-center">
        <Spinner label="Loading…" />
    </div>
);

const RootLayout = () => {
    return (
        <AuthProvider>
            <CurrencyProvider>
                <ErrorBoundary>
                    <Suspense fallback={<PageFallback />}>
                        <Outlet />
                    </Suspense>
                </ErrorBoundary>
                <Toaster richColors position="top-right" />
            </CurrencyProvider>
        </AuthProvider>
    );
};

const router = createBrowserRouter([
    {
        element: <RootLayout />,
        children: [
            {
                path: "/",
                element: <MainLayout />,
                children: [
                    { index: true, element: <Home /> },
                    { path: "tour/:id", element: <TourDetails /> },
                    { path: "tours", element: <SearchPage /> },
                    { path: "destinations", element: <DestinationsPage /> },
                    { path: "destinations/:slug", element: <DestinationDetails /> },
                    { path: "collections", element: <CollectionsPage /> },
                    { path: "collections/:slug", element: <CollectionDetails /> },
                    { path: "blog", element: <BlogPage /> },
                    { path: "about", element: <AboutPage /> },
                    { path: "contact", element: <ContactPage /> },
                    { path: "privacy", element: <PrivacyPage /> },
                    { path: "terms", element: <TermsPage /> },
                    { path: "faq", element: <FAQPage /> },
                    { path: "blog/:slug", element: <BlogDetails /> },
                    { path: "login", element: <LoginPage /> },
                    { path: "register", element: <RegisterPage /> },
                    {
                        element: <ProtectedRoute />,
                        children: [
                            { path: "dashboard", element: <Dashboard /> },
                            { path: "book", element: <BookingPage /> },
                            { path: "write-article", element: <WriteArticle /> },
                        ]
                    },
                ],
            },

            // Admin Routes
            {
                path: "/admin",
                element: <ProtectedAdminRoute />,
                children: [
                    {
                        element: <AdminLayout />,
                        children: [
                            // Dashboard
                            { path: "dashboard", element: <AdminDashboard /> },

                            // Content management
                            { path: "homepage", element: <AdminHomepage /> },
                            { path: "about", element: <AdminAbout /> },
                            { path: "faq", element: <AdminFAQ /> },

                            // Catalog
                            { path: "tours", element: <AdminTours /> },
                            { path: "tours/new", element: <AdminTourForm /> },
                            { path: "tours/:id/edit", element: <AdminTourForm /> },
                            { path: "destinations", element: <AdminDestinations /> },
                            { path: "collections", element: <AdminCollections /> },

                            // Operations
                            { path: "bookings", element: <AdminBookings /> },
                            { path: "payments", element: <AdminPayments /> },
                            { path: "reviews", element: <AdminReviews /> },

                            // Community
                            { path: "users", element: <AdminUsers /> },
                            { path: "inquiries", element: <AdminInquiries /> },
                            { path: "subscribers", element: <AdminSubscribers /> },
                            { path: "blog", element: <AdminBlog /> },

                            // Legacy redirect: /admin/content → homepage
                            { path: "content", element: <AdminContent /> },

                            // System
                            { path: "settings", element: <AdminSettings /> },
                        ]
                    },
                ]
            },

            {
                path: "*",
                element: <MainLayout />,
                children: [{ path: "*", element: <NotFound /> }]
            }
        ]
    }
]);

function App() {
    return <RouterProvider router={router} />;
}

export default App;
