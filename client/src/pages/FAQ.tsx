import { Link } from "react-router-dom";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/PageTitle";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { usePublicSettings } from "@/hooks/use-settings";
import { FAQS } from "@/lib/faqs";

export const FAQPage = () => {
    const { data } = usePublicSettings();
    const faqsFromSettings = data?.settings?.faqs;

    const items = (faqsFromSettings?.length ?? 0) > 0
        ? faqsFromSettings!.slice().sort((a, b) => a.order - b.order)
        : FAQS.map((f, i) => ({ question: f.q, answer: f.a, order: i }));

    return (
        <div className="bg-background min-h-screen pt-24 pb-16">
            <PageTitle
                title="FAQ"
                description="Answers to the most common questions about booking, payments, cancellations, and more."
                jsonLd={{
                    '@context': 'https://schema.org',
                    '@type': 'FAQPage',
                    mainEntity: items.map((item) => ({
                        '@type': 'Question',
                        name: item.question,
                        acceptedAnswer: { '@type': 'Answer', text: item.answer },
                    })),
                }}
            />
            <Container className="max-w-3xl">
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">Frequently Asked Questions</h1>
                    <p className="text-lg text-muted-foreground">Everything you need to know before you travel.</p>
                </div>

                <Accordion type="single" collapsible className="w-full space-y-3">
                    {items.map((item, i) => (
                        <AccordionItem
                            key={i}
                            value={`faq-${i}`}
                            className="border border-slate-100 rounded-2xl px-6 bg-white shadow-sm"
                        >
                            <AccordionTrigger className="text-left font-bold hover:no-underline hover:text-brand-orange py-5">
                                {item.question}
                            </AccordionTrigger>
                            <AccordionContent className="text-muted-foreground pb-5">
                                {item.answer}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>

                <div className="text-center mt-12 p-8 bg-secondary/30 rounded-2xl">
                    <h2 className="text-xl font-bold mb-2">Still have questions?</h2>
                    <p className="text-muted-foreground mb-5">Our team is here to help you plan the perfect trip.</p>
                    <Button variant="brand" asChild>
                        <Link to="/contact?topic=question">Get in Touch</Link>
                    </Button>
                </div>
            </Container>
        </div>
    );
};
