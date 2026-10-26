import { Container } from "@/components/ui/container";
import { PageTitle } from "@/components/PageTitle";
import { LEGAL_UPDATED, TERMS_SECTIONS } from "@/lib/legal";

export const TermsPage = () => {
    return (
        <div className="bg-background min-h-screen pt-24 pb-16">
            <PageTitle
                title="Terms of Service"
                description="The terms for using Wandeazy and booking tours, including payments, cancellations and refunds, and your responsibilities as a traveller."
            />
            <Container className="max-w-3xl">
                <h1 className="text-4xl md:text-5xl font-display font-bold mb-2">Terms of Service</h1>
                <p className="text-muted-foreground mb-10">Last updated: {LEGAL_UPDATED}</p>
                <div className="space-y-8">
                    {TERMS_SECTIONS.map((s) => (
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
