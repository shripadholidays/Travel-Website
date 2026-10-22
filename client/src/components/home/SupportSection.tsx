import { motion } from "framer-motion";
import { Container } from "@/components/ui/container";
import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Send, Headphones, ShieldCheck } from "lucide-react";
import { usePublicSettings, type SupportFeature, type ChatMessage } from "@/hooks/use-settings";

function resolveIcon(name: string): LucideIcon {
    return (LucideIcons as unknown as Record<string, LucideIcon>)[name] || LucideIcons.HelpCircle;
}

const FALLBACK_FEATURES: SupportFeature[] = [
    { icon: "Zap", title: "Instant Answers", description: "Travel queries, visa help, or itinerary tweaks — get assistance anytime, anywhere." },
    { icon: "Headphones", title: "24/7 Priority Support", description: "Chat or call — we're always instantly available when you're traveling." },
    { icon: "MessageCircle", title: "On-the-Go Replans", description: "Weather updates, activity swaps, and real-time confirmations on the fly." },
    { icon: "ShieldCheck", title: "Trusted by Thousands", description: "3M+ happy explorers • 97% satisfaction • 4.8★ average rating." },
];

const FALLBACK_MSGS: ChatMessage[] = [
    { sender: "assistant", text: "Hi! I'm your Wandeazy travel assistant. How can I help today?" },
    { sender: "user", text: "I booked a Bali trip but haven't received my flight confirmation." },
    { sender: "assistant", text: "Let me quickly check that for you. Could you share your booking ID?" },
    { sender: "user", text: "It's WD-983245. Paid last week." },
    { sender: "assistant", text: "Found it! Your flight is confirmed. The updated itinerary has been sent to your email and WhatsApp." },
];

export const SupportSection = () => {
    const { data } = usePublicSettings();
    const section = data?.settings?.supportSection;

    const heading = section?.heading || "You Travel, We Handle The Rest.";
    const subheading = section?.subheading || "Support Beyond Booking";
    const paragraph = section?.paragraph || "From the moment you click book until you're back home, our dedicated team acts as your personal travel concierge 24/7.";
    const features = (section?.features?.length ?? 0) > 0 ? section!.features : FALLBACK_FEATURES;
    const chatMessages = (section?.chatMessages?.length ?? 0) > 0 ? section!.chatMessages : FALLBACK_MSGS;

    return (
        <section className="py-24 bg-white relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #F97316 0%, transparent 25%), radial-gradient(circle at 80% 80%, #0F172A 0%, transparent 25%)' }}
            />

            <Container>
                <div className="max-w-7xl mx-auto px-4 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

                        {/* Phone Mockup */}
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
                            >
                                <Headphones className="w-7 h-7" />
                            </motion.div>
                            <motion.div
                                animate={{ y: [0, 10, 0] }}
                                transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
                                className="absolute -bottom-6 -left-6 w-14 h-14 bg-brand-blue rounded-2xl shadow-xl flex items-center justify-center text-white z-20 border border-white/20"
                            >
                                <ShieldCheck className="w-7 h-7" />
                            </motion.div>

                            <div className="bg-white rounded-[3rem] shadow-2xl border-8 border-slate-900 overflow-hidden relative h-[640px] z-10 w-full">
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-slate-900 rounded-b-2xl z-30" />

                                <div className="bg-slate-50 border-b border-slate-100 p-6 pt-12 flex items-center gap-3 relative z-20">
                                    <div className="w-10 h-10 rounded-full bg-brand-orange flex items-center justify-center text-white font-bold shadow-md">W</div>
                                    <div>
                                        <h4 className="font-bold text-sm text-slate-900">Wandeazy Support</h4>
                                        <span className="flex items-center gap-1.5 text-[10px] text-green-600 font-medium">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                            Online
                                        </span>
                                    </div>
                                </div>

                                <div className="bg-slate-50 h-full p-4 space-y-4">
                                    {chatMessages.map((msg, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                            whileInView={{ opacity: 1, y: 0, scale: 1 }}
                                            viewport={{ once: true }}
                                            transition={{ delay: i * 0.8 + 0.5, duration: 0.4 }}
                                            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.sender === 'user' ? 'bg-brand-orange text-white rounded-tr-sm' : 'bg-white text-slate-700 border border-slate-100 rounded-tl-sm'}`}>
                                                {msg.text}
                                            </div>
                                        </motion.div>
                                    ))}

                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        whileInView={{ opacity: 1 }}
                                        transition={{ delay: chatMessages.length * 0.8 + 0.5, duration: 0.5 }}
                                        className="flex justify-start"
                                    >
                                        <div className="bg-white border border-slate-100 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex gap-1 items-center">
                                            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                                        </div>
                                    </motion.div>
                                </div>

                                <div className="absolute bottom-0 left-0 w-full bg-white p-4 border-t border-slate-100">
                                    <div className="h-10 bg-slate-50 rounded-full border border-slate-200 flex items-center px-4 justify-between text-slate-400 text-xs">
                                        <span>Type a message...</span>
                                        <Send className="w-4 h-4 text-brand-orange" />
                                    </div>
                                </div>
                            </div>
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
