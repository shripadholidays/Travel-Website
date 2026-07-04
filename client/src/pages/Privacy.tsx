import { Container } from "@/components/ui/container";
import { PageTitle } from "@/components/PageTitle";

const SECTIONS = [
    {
        title: "1. Information We Collect",
        body: "We collect information you provide directly — such as your name, email, and booking details — as well as data gathered automatically through your use of our services, including device and usage information.",
    },
    {
        title: "2. How We Use Your Information",
        body: "Your information is used to process bookings, personalize your experience, communicate with you about your trips, and improve our services. We never sell your personal data to third parties.",
    },
    {
        title: "3. Sharing of Information",
        body: "We share information only with the travel operators and payment processors necessary to fulfill your booking, and where required by law. All partners are bound by confidentiality obligations.",
    },
    {
        title: "4. Data Security",
        body: "We use industry-standard encryption and security practices to protect your data. Payments are processed securely through PCI-compliant providers.",
    },
    {
        title: "5. Your Rights",
        body: "You may access, correct, or delete your personal information at any time by contacting us. You can also opt out of marketing communications via the unsubscribe link in any email.",
    },
    {
        title: "6. Cookies",
        body: "We use cookies to keep you signed in and to understand how our site is used. You can control cookies through your browser settings.",
    },
    {
        title: "7. Contact",
        body: "If you have questions about this Privacy Policy, please reach out via our Contact page.",
    },
];

export const PrivacyPage = () => {
    return (
        <div className="bg-background min-h-screen pt-24 pb-16">
            <PageTitle
                title="Privacy Policy"
                description="How Wandeazy collects, uses, and protects your personal information."
            />
            <Container className="max-w-3xl">
                <h1 className="text-4xl md:text-5xl font-display font-bold mb-2">Privacy Policy</h1>
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
