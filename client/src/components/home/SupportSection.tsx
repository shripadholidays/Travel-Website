import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Container } from "@/components/ui/container";
import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Send, Headphones, ShieldCheck, Loader2, Mail } from "lucide-react";
import { usePublicSettings, type SupportFeature } from "@/hooks/use-settings";
import { useCreateInquiry, type InquiryTopic } from "@/hooks/use-contact";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

function resolveIcon(name: string): LucideIcon {
    return (LucideIcons as unknown as Record<string, LucideIcon>)[name] || LucideIcons.HelpCircle;
}

const FALLBACK_FEATURES: SupportFeature[] = [
    { icon: "MessageCircle", title: "Ask Us Anything", description: "Travel queries, visa help or itinerary tweaks: send a message from any page." },
    { icon: "Clock", title: "Replies Within 24 Hours", description: "A real travel specialist answers every message, usually the same day." },
    { icon: "Route", title: "Trips Made to Measure", description: "Tell us what you love and we will shape an itinerary around it." },
    { icon: "ShieldCheck", title: "Secure Booking", description: "Secure payments by Razorpay (cards, UPI, netbanking), and your booking details in your dashboard." },
];

const FALLBACK_GREETING = "Hi! Tell us where you would like to go, or ask anything about a booking. A travel specialist will reply by email.";

const TOPICS: { topic: InquiryTopic; label: string }[] = [
    { topic: "trip", label: "Plan a custom trip" },
    { topic: "booking", label: "About my booking" },
    { topic: "question", label: "Visas & documents" },
];

export const SupportSection = () => {
    const { data } = usePublicSettings();
    const section = data?.settings?.supportSection;

    const heading = section?.heading || "You Travel, We Handle The Rest.";
    const subheading = section?.subheading || "Support Beyond Booking";
    const paragraph = section?.paragraph || "From the moment you click book until you're back home, our team is a message away.";
    const features = (section?.features?.length ?? 0) > 0 ? section!.features : FALLBACK_FEATURES;
    // Only the team's greeting is shown; the rest of the conversation is the visitor's own
    const greetings = (section?.chatMessages ?? []).filter((m) => m.sender === "assistant" && m.text.trim()).map((m) => m.text);

    return (
        <section className="py-24 bg-white relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #F97316 0%, transparent 25%), radial-gradient(circle at 80% 80%, #0F172A 0%, transparent 25%)' }}
            />

            <Container>
                <div className="max-w-7xl mx-auto px-4 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                            className="relative w-full max-w-[350px] mx-auto flex flex-col justify-center"
                        >
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-brand-orange/5 rounded-full blur-3xl -z-10" />

                            <motion.div
                                animate={{ y: [0, -10, 0] }}
                                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                                className="absolute -top-6 -right-6 w-14 h-14 bg-white rounded-2xl shadow-xl flex items-center justify-center text-brand-orange z-20 border border-slate-100"
                                aria-hidden
                            >
                                <Headphones className="w-7 h-7" />
                            </motion.div>
                            <motion.div
                                animate={{ y: [0, 10, 0] }}
                                transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
                                className="absolute -bottom-6 -left-6 w-14 h-14 bg-brand-blue rounded-2xl shadow-xl flex items-center justify-center text-white z-20 border border-white/20"
                                aria-hidden
                            >
                                <ShieldCheck className="w-7 h-7" />
                            </motion.div>

                            <MessageBox greetings={greetings.length ? greetings : [FALLBACK_GREETING]} />
                        </motion.div>

                        {/* Text + Feature Cards */}
                        <div className="w-full max-w-xl mx-auto lg:mx-0">
                            <div className="mb-10 text-center lg:text-left">
                                <span className="text-brand-orange font-bold tracking-widest uppercase text-sm mb-2 block">{subheading}</span>
                                <h2 className="text-4xl md:text-5xl font-display font-bold text-brand-blue mb-4">{heading}</h2>
                                <p className="text-lg text-slate-500 max-w-lg leading-relaxed mx-auto lg:mx-0">{paragraph}</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {features.map((feature, i) => {
                                    const Icon = resolveIcon(feature.icon);
                                    return (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, y: 20 }}
                                            whileInView={{ opacity: 1, y: 0 }}
                                            viewport={{ once: true }}
                                            transition={{ delay: i * 0.1, duration: 0.5 }}
                                            className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group text-left"
                                        >
                                            <div className="w-12 h-12 bg-brand-light rounded-xl flex items-center justify-center text-brand-orange mb-4 group-hover:bg-brand-orange group-hover:text-white transition-colors">
                                                <Icon className="w-6 h-6" />
                                            </div>
                                            <h3 className="font-bold text-lg text-brand-blue mb-2">{feature.title}</h3>
                                            <p className="text-sm text-slate-500 leading-relaxed">{feature.description}</p>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>

                    </div>
                </div>
            </Container>
        </section>
    );
};

type Bubble = { from: "team" | "me"; text: string };
type Step = "compose" | "details" | "sent";

/** A real message box: what the visitor writes reaches the team as an inquiry. */
const MessageBox = ({ greetings }: { greetings: string[] }) => {
    const { user } = useAuth();
    const createInquiry = useCreateInquiry();
    const [bubbles, setBubbles] = useState<Bubble[]>([]);
    const [text, setText] = useState("");
    const [topic, setTopic] = useState<InquiryTopic>("trip");
    const [step, setStep] = useState<Step>("compose");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [pending, setPending] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = scrollRef.current;
        if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }, [bubbles, step]);

    const send = (message: string, fullName: string, replyTo: string) => {
        createInquiry.mutate(
            { fullName, email: replyTo, message, topic, source: "chat" },
            {
                onSuccess: () => {
                    setStep("sent");
                    setBubbles((b) => [...b, {
                        from: "team",
                        text: `Thanks ${fullName.split(" ")[0]}! Your message is with our travel team. We'll reply to ${replyTo} within 24 hours.`,
                    }]);
                },
                onError: (err: Error) => {
                    setStep("compose");
                    setText(message);
                    setBubbles((b) => b.slice(0, -1));
                    toast.error(err.message || "Your message could not be sent. Please try again.");
                },
            },
        );
    };

    const submitMessage = (e: React.FormEvent) => {
        e.preventDefault();
        const message = text.trim();
        if (!message) return;
        setBubbles((b) => [...b, { from: "me", text: message }]);
        setText("");
        if (user?.email) {
            send(message, user.displayName || user.email, user.email);
        } else {
            setPending(message);
            setStep("details");
        }
    };

    const submitDetails = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !/.+@.+\..+/.test(email.trim())) {
            toast.error("Please add your name and a valid email so we can reply.");
            return;
        }
        send(pending, name.trim(), email.trim());
    };

    const reset = () => {
        setBubbles([]);
        setStep("compose");
        setPending("");
    };

    return (
        <div className="bg-white rounded-[3rem] shadow-2xl border-8 border-slate-900 overflow-hidden relative h-[640px] z-10 w-full flex flex-col">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-slate-900 rounded-b-2xl z-30" aria-hidden />

            <div className="bg-slate-50 border-b border-slate-100 p-6 pt-12 flex items-center gap-3 shrink-0">
                <div className="w-10 h-10 rounded-full bg-brand-orange flex items-center justify-center text-white font-bold shadow-md" aria-hidden>W</div>
                <div>
                    <h3 className="font-bold text-sm text-slate-900">Wandeazy Travel Team</h3>
                    <span className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                        <Mail className="w-3 h-3" /> Replies by email within 24 hours
                    </span>
                </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto bg-slate-50 p-4 space-y-3" aria-live="polite">
                {greetings.map((g, i) => <ChatBubble key={`g${i}`} bubble={{ from: "team", text: g }} />)}
                {bubbles.map((b, i) => <ChatBubble key={i} bubble={b} />)}

                {step === "compose" && bubbles.length === 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                        {TOPICS.map((t) => (
                            <button
                                key={t.topic}
                                type="button"
                                onClick={() => setTopic(t.topic)}
                                aria-pressed={topic === t.topic}
                                className={cn(
                                    "text-xs font-medium px-3 py-1.5 rounded-full border transition-colors",
                                    topic === t.topic
                                        ? "bg-brand-orange text-white border-brand-orange"
                                        : "bg-white text-slate-600 border-slate-200 hover:border-brand-orange/50",
                                )}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                )}

                {step === "details" && (
                    <form onSubmit={submitDetails} className="bg-white border border-slate-100 rounded-2xl rounded-tl-sm p-3.5 space-y-2 shadow-sm max-w-[90%]">
                        <p className="text-sm text-slate-700">Where should we send our reply?</p>
                        <input
                            aria-label="Your name"
                            placeholder="Your name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full h-9 px-3 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-orange/40"
                            autoComplete="name"
                            required
                        />
                        <input
                            aria-label="Your email"
                            type="email"
                            placeholder="you@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full h-9 px-3 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-orange/40"
                            autoComplete="email"
                            required
                        />
                        <button
                            type="submit"
                            disabled={createInquiry.isPending}
                            className="w-full h-9 rounded-lg bg-brand-orange text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                        >
                            {createInquiry.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            Send message
                        </button>
                    </form>
                )}

                {step === "sent" && (
                    <div className="flex gap-2 pt-1">
                        <button type="button" onClick={reset} className="text-xs font-medium px-3 py-1.5 rounded-full border border-slate-200 bg-white text-slate-600 hover:border-brand-orange/50">
                            Send another message
                        </button>
                        <Link to="/faq" className="text-xs font-medium px-3 py-1.5 rounded-full border border-slate-200 bg-white text-slate-600 hover:border-brand-orange/50">
                            Read the FAQ
                        </Link>
                    </div>
                )}
            </div>

            <form onSubmit={submitMessage} className="bg-white p-4 border-t border-slate-100 shrink-0">
                <div className="h-11 bg-slate-50 rounded-full border border-slate-200 flex items-center pl-4 pr-1.5 gap-2 focus-within:ring-2 focus-within:ring-brand-orange/40">
                    <input
                        aria-label="Message to the travel team"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder={step === "compose" ? "Type a message…" : "Message sent"}
                        disabled={step !== "compose" || createInquiry.isPending}
                        maxLength={2000}
                        className="flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed"
                    />
                    <button
                        type="submit"
                        aria-label="Send message"
                        disabled={step !== "compose" || !text.trim() || createInquiry.isPending}
                        className="w-8 h-8 rounded-full bg-brand-orange text-white flex items-center justify-center disabled:bg-slate-200 disabled:text-slate-400 transition-colors"
                    >
                        {createInquiry.isPending && step === "compose" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                </div>
            </form>
        </div>
    );
};

const ChatBubble = ({ bubble }: { bubble: Bubble }) => (
    <div className={cn("flex", bubble.from === "me" ? "justify-end" : "justify-start")}>
        <div
            className={cn(
                "max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap break-words",
                bubble.from === "me"
                    ? "bg-brand-orange text-white rounded-tr-sm"
                    : "bg-white text-slate-700 border border-slate-100 rounded-tl-sm",
            )}
        >
            {bubble.text}
        </div>
    </div>
);
