import { Container } from "@/components/ui/container";
import { PageTitle } from "@/components/PageTitle";
import { LEGAL_UPDATED, PRIVACY_SECTIONS } from "@/lib/legal";

export const PrivacyPage = () => {
    return (
        <div className="bg-background min-h-screen pt-24 pb-16">
            <PageTitle
                title="Privacy Policy"
                description="How Wandeazy collects, uses, shares and protects your personal information when you browse, sign up or book a tour."
            />
            <Container className="max-w-3xl">
                <h1 className="text-4xl md:text-5xl font-display font-bold mb-2">Privacy Policy</h1>
                <p className="text-muted-foreground mb-10">Last updated: {LEGAL_UPDATED}</p>
                <div className="space-y-8">
                    {PRIVACY_SECTIONS.map((s) => (
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
