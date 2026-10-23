import { Link } from "react-router-dom";
import { MessageCircle, ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { usePublicSettings } from "@/hooks/use-settings";
import { FAQS } from "@/lib/faqs";

export const FaqSection = () => {
    const { data } = usePublicSettings();
    const faqsFromSettings = data?.settings?.faqs;

    const items = (faqsFromSettings?.length ?? 0) > 0
        ? faqsFromSettings!
            .slice()
            .sort((a, b) => a.order - b.order)
            .slice(0, 5)
        : FAQS.slice(0, 5).map((f, i) => ({ question: f.q, answer: f.a, order: i }));

    return (
        <section className="py-24 bg-background">
            <Container>
                <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-12 lg:gap-16 items-start">
                    <div className="lg:sticky lg:top-28">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="h-0.5 w-12 bg-brand-orange" />
                            <span className="text-brand-orange font-bold uppercase tracking-widest text-sm">Help Center</span>
                        </div>
                        <h2 className="text-4xl md:text-5xl font-display font-bold text-brand-blue mb-4">
                            Frequently asked questions
                        </h2>
                        <p className="text-muted-foreground text-lg mb-8 max-w-md">
                            Everything you need to know before you travel. Can't find what you're looking for? Our team is happy to help.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Button variant="brand" asChild>
                                <Link to="/contact?topic=question" className="flex items-center gap-2">
                                    <MessageCircle className="w-4 h-4" /> Contact Us
                                </Link>
                            </Button>
                            <Button variant="outline" asChild>
                                <Link to="/faq" className="flex items-center gap-2">
                                    View all FAQs <ArrowRight className="w-4 h-4" />
                                </Link>
                            </Button>
                        </div>
                    </div>

                    <Accordion type="single" collapsible defaultValue="faq-0" className="w-full space-y-3">
                        {items.map((item, i) => (
                            <AccordionItem
                                key={i}
                                value={`faq-${i}`}
                                className="border border-slate-100 rounded-2xl px-6 bg-white shadow-sm"
                            >
                                <AccordionTrigger className="text-left font-bold hover:no-underline hover:text-brand-orange py-5">
                                    {item.question}
                                </AccordionTrigger>
                                <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
                                    {item.answer}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </div>
            </Container>
        </section>
    );
};
