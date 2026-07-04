import { Container } from "@/components/ui/container";
import { PageTitle } from "@/components/PageTitle";

const SECTIONS = [
    {
        title: "1. Acceptance of Terms",
        body: "By accessing or using Wandeazy, you agree to be bound by these Terms of Service. If you do not agree, please do not use our services.",
    },
    {
        title: "2. Bookings & Payments",
        body: "All bookings are subject to availability and confirmation. Prices are shown in your selected currency and may change until a booking is confirmed. Payment is required to secure your reservation.",
    },
    {
        title: "3. Cancellations & Refunds",
        body: "Cancellation terms vary by tour and are shown at the time of booking. Most tours offer free cancellation up to 24 hours before departure. Refunds are processed according to the applicable policy.",
    },
    {
        title: "4. User Responsibilities",
        body: "You are responsible for ensuring you meet all travel requirements, including valid documentation, visas, and health requirements. You agree to provide accurate information when booking.",
    },
    {
        title: "5. Limitation of Liability",
        body: "Wandeazy acts as an intermediary between you and travel operators. We are not liable for acts, errors, or omissions of third-party providers beyond our reasonable control.",
    },
    {
        title: "6. Intellectual Property",
        body: "All content on this platform, including text, images, and branding, is the property of Wandeazy or its licensors and may not be reproduced without permission.",
    },
    {
        title: "7. Changes to Terms",
        body: "We may update these Terms from time to time. Continued use of the platform after changes constitutes acceptance of the revised Terms.",
    },
];

export const TermsPage = () => {
    return (
        <div className="bg-background min-h-screen pt-24 pb-16">
            <PageTitle
                title="Terms of Service"
                description="The terms and conditions governing your use of Wandeazy."
            />
            <Container className="max-w-3xl">
                <h1 className="text-4xl md:text-5xl font-display font-bold mb-2">Terms of Service</h1>
                <p className="text-muted-foreground mb-10">Last updated: January 2026</p>
                <div className="space-y-8">
                    {SECTIONS.map((s) => (
                        <section key={s.title}>
                            <h2 className="text-xl font-bold mb-3">{s.title}</h2>
                            <p className="text-muted-foreground leading-relaxed">{s.body}</p>
                        </section>
                    ))}
                </div>
            </Container>
        </div>
    );
};
