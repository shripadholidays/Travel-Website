import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Mail, MapPin, Phone, Send, Loader2, CheckCircle2, Calendar as CalendarIcon, X, Tag } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Container } from "@/components/ui/container";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PageTitle } from "@/components/PageTitle";
import { cn } from "@/lib/utils";
import { usePublicSettings } from "@/hooks/use-settings";
import { useCreateInquiry, type InquirySource, type InquiryTopic } from "@/hooks/use-contact";
import { useAuth } from "@/context/AuthContext";

const TOPICS: { value: InquiryTopic; label: string; hint: string }[] = [
    { value: "trip", label: "Plan a trip", hint: "Tell us where and when, and we'll put together a plan." },
    { value: "booking", label: "An existing booking", hint: "Include your booking reference if you have it." },
    { value: "question", label: "A general question", hint: "Visas, payments, what's included: ask away." },
    { value: "other", label: "Something else", hint: "Partnerships, press or anything else." },
];

const SOURCES: InquirySource[] = ["contact", "chat", "no-results", "tour", "destination"];

const emptyForm = { fullName: "", email: "", phoneNumber: "", numberOfTravelers: 1, message: "" };

export const ContactPage = () => {
    const { data } = usePublicSettings();
    const settings = data?.settings;
    const { user } = useAuth();
    const [params] = useSearchParams();
    const createInquiry = useCreateInquiry();

    // Links from tours, destinations and empty searches say what the visitor was looking at
    const initialTopic = TOPICS.some((t) => t.value === params.get("topic")) ? (params.get("topic") as InquiryTopic) : "trip";
    const source = SOURCES.includes(params.get("source") as InquirySource) ? (params.get("source") as InquirySource) : "contact";

    const [topic, setTopic] = useState<InquiryTopic>(initialTopic);
    const [context, setContext] = useState(params.get("about")?.slice(0, 200) ?? "");
    const [submitted, setSubmitted] = useState(false);
    const [travelDate, setTravelDate] = useState<Date>();
    const [calendarOpen, setCalendarOpen] = useState(false);
    const [form, setForm] = useState(emptyForm);

    // Signed-in travellers should not have to type who they are
    useEffect(() => {
        if (!user) return;
        setForm((f) => ({
            ...f,
            fullName: f.fullName || user.displayName || "",
            email: f.email || user.email || "",
        }));
    }, [user]);

    const update = (field: keyof typeof form, value: string | number) =>
        setForm((f) => ({ ...f, [field]: value }));

    const isTrip = topic === "trip";

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.fullName.trim() || !form.email.trim()) {
            toast.error("Please add your name and email so we can reply.");
            return;
        }
        if (!isTrip && !form.message.trim()) {
            toast.error("Please tell us how we can help.");
            return;
        }
        createInquiry.mutate(
            {
                fullName: form.fullName.trim(),
                email: form.email.trim(),
                phoneNumber: form.phoneNumber.trim() || undefined,
                numberOfTravelers: isTrip ? form.numberOfTravelers : undefined,
                preferredTravelDate: isTrip && travelDate ? format(travelDate, "yyyy-MM-dd") : undefined,
                message: form.message.trim() || undefined,
                topic,
                context: context || undefined,
                source,
            },
            {
                onSuccess: () => {
                    setSubmitted(true);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                },
                onError: (err: Error) => toast.error(err.message || "Failed to send. Please try again."),
            }
        );
    };

    const reset = () => {
        setSubmitted(false);
        setTravelDate(undefined);
        setForm({ ...emptyForm, fullName: user?.displayName ?? "", email: user?.email ?? "" });
    };

    return (
        <div className="bg-background min-h-screen pt-24 pb-16">
            <PageTitle
                title="Contact Us"
                description="Get in touch with Wandeazy or tell us about your dream trip and we'll craft the perfect itinerary."
            />
            <Container>
                <div className="text-center max-w-2xl mx-auto mb-12">
                    <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">How can we help?</h1>
                    <p className="text-lg text-muted-foreground">
                        Plan a trip, ask about a booking or send us a question. A travel specialist replies within 24 hours.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Contact info */}
                    <div className="space-y-6">
                        {/* No made-up address or phone: these show once set in Admin → Settings */}
                        {settings?.address && <ContactItem icon={MapPin} label="Visit us" value={settings.address} />}
                        {settings?.contactPhone && (
                            <ContactItem
                                icon={Phone}
                                label="Call us"
                                value={settings.contactPhone}
                                href={`tel:${settings.contactPhone.replace(/\s/g, '')}`}
                            />
                        )}
                        <ContactItem
                            icon={Mail}
                            label="Email us"
                            value={settings?.contactEmail || 'hello@wandeazy.com'}
                            href={`mailto:${settings?.contactEmail || 'hello@wandeazy.com'}`}
                        />
                        <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-muted-foreground">
                            Looking for answers right away? The <Link to="/faq" className="text-brand-orange font-medium hover:underline">FAQ</Link> covers
                            bookings, payments and cancellations.
                        </div>
                    </div>

                    {/* Form */}
                    <div className="lg:col-span-2 bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm">
                        {submitted ? (
                            <div className="text-center py-12" role="status">
                                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                                </div>
                                <h2 className="text-2xl font-bold mb-2">Thank you!</h2>
                                <p className="text-muted-foreground mb-6">
                                    Your message is on its way. We'll reply to <span className="font-medium text-foreground">{form.email}</span> within 24 hours.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                    <Button variant="outline" onClick={reset}>Send another message</Button>
                                    <Button variant="brand" asChild><Link to="/tours">Browse tours</Link></Button>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <fieldset>
                                    <legend className="text-sm font-medium mb-3">What is this about?</legend>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                        {TOPICS.map((t) => (
                                            <button
                                                key={t.value}
                                                type="button"
                                                onClick={() => setTopic(t.value)}
                                                aria-pressed={topic === t.value}
                                                className={cn(
                                                    "h-11 px-3 rounded-xl border text-sm font-medium transition-colors",
                                                    topic === t.value
                                                        ? "border-brand-orange bg-brand-orange/10 text-brand-orange"
                                                        : "border-slate-200 text-slate-600 hover:border-brand-orange/40",
                                                )}
                                            >
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-2">{TOPICS.find((t) => t.value === topic)?.hint}</p>
                                </fieldset>

                                {context && (
                                    <div className="flex items-center gap-2 text-sm bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 w-fit max-w-full">
                                        <Tag className="w-4 h-4 text-brand-orange shrink-0" />
                                        <span className="truncate">About: <span className="font-medium">{context}</span></span>
                                        <button type="button" onClick={() => setContext("")} aria-label="Remove topic" className="text-slate-400 hover:text-slate-700">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="fullName">Full name *</Label>
                                        <Input id="fullName" autoComplete="name" value={form.fullName} onChange={(e) => update('fullName', e.target.value)} required />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="email">Email *</Label>
                                        <Input id="email" type="email" autoComplete="email" value={form.email} onChange={(e) => update('email', e.target.value)} required />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="phone">Phone <span className="text-muted-foreground font-normal">(optional)</span></Label>
                                        <Input id="phone" type="tel" autoComplete="tel" value={form.phoneNumber} onChange={(e) => update('phoneNumber', e.target.value)} />
                                    </div>
                                    {isTrip && (
                                        <div className="space-y-1.5">
                                            <Label htmlFor="travelers">Number of travellers</Label>
                                            <Input
                                                id="travelers"
                                                type="number"
                                                min={1}
                                                value={form.numberOfTravelers}
                                                onChange={(e) => update('numberOfTravelers', Math.max(1, parseInt(e.target.value) || 1))}
                                            />
                                        </div>
                                    )}
                                </div>

                                {isTrip && (
                                    <div className="space-y-1.5">
                                        <Label htmlFor="travelDate">Preferred travel date <span className="text-muted-foreground font-normal">(optional)</span></Label>
                                        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    id="travelDate"
                                                    type="button"
                                                    variant="outline"
                                                    className={cn(
                                                        "w-full h-11 justify-start text-left font-normal rounded-xl border-input",
                                                        !travelDate && "text-muted-foreground"
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4 text-brand-orange" />
                                                    {travelDate ? format(travelDate, "PPP") : <span>My dates are flexible</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={travelDate}
                                                    onSelect={(d) => { setTravelDate(d); setCalendarOpen(false); }}
                                                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <Label htmlFor="message">
                                        {isTrip ? <>Tell us about your trip <span className="text-muted-foreground font-normal">(optional)</span></> : "Your message *"}
                                    </Label>
                                    <Textarea
                                        id="message"
                                        rows={5}
                                        placeholder={isTrip ? "Where would you like to go? What do you love doing on holiday?" : "How can we help?"}
                                        value={form.message}
                                        onChange={(e) => update('message', e.target.value)}
                                        maxLength={2000}
                                        required={!isTrip}
                                    />
                                </div>
                                <Button type="submit" variant="brand" size="lg" disabled={createInquiry.isPending} className="w-full md:w-auto">
                                    {createInquiry.isPending ? (
                                        <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Sending…</>
                                    ) : (
                                        <><Send className="w-4 h-4 mr-2" /> Send message</>
                                    )}
                                </Button>
                            </form>
                        )}
                    </div>
                </div>
            </Container>
        </div>
    );
};

const ContactItem = ({
    icon: Icon,
    label,
    value,
    href,
}: {
    icon: typeof Mail;
    label: string;
    value: string;
    href?: string;
}) => (
    <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex items-start gap-4">
        <div className="w-11 h-11 rounded-xl bg-brand-orange/10 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-brand-orange" />
        </div>
        <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{label}</p>
            {href ? (
                <a href={href} className="font-medium hover:text-brand-orange transition-colors break-words">{value}</a>
            ) : (
                <p className="font-medium break-words">{value}</p>
            )}
        </div>
    </div>
);
