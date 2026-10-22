import { useState } from "react";
import { Mail, MapPin, Phone, Send, Loader2, CheckCircle2, Calendar as CalendarIcon } from "lucide-react";
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
import { useCreateInquiry } from "@/hooks/use-contact";

export const ContactPage = () => {
    const { data } = usePublicSettings();
    const settings = data?.settings;
    const createInquiry = useCreateInquiry();
    const [submitted, setSubmitted] = useState(false);
    const [travelDate, setTravelDate] = useState<Date>();
    const [calendarOpen, setCalendarOpen] = useState(false);

    const [form, setForm] = useState({
        fullName: '',
        email: '',
        phoneNumber: '',
        preferredTravelDate: '',
        numberOfTravelers: 1,
        message: '',
    });

    const update = (field: keyof typeof form, value: string | number) =>
        setForm((f) => ({ ...f, [field]: value }));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.fullName.trim() || !form.email.trim() || !form.phoneNumber.trim() || !travelDate) {
            toast.error('Please fill in all required fields.');
            return;
        }
        createInquiry.mutate(
            {
                ...form,
                fullName: form.fullName.trim(),
                preferredTravelDate: format(travelDate, 'yyyy-MM-dd'),
                message: form.message.trim() || undefined,
            },
            {
                onSuccess: () => {
                    setSubmitted(true);
                    toast.success('Your inquiry has been sent! We\'ll be in touch soon.');
                },
                onError: (err: Error) => toast.error(err.message || 'Failed to send. Please try again.'),
            }
        );
    };

    return (
        <div className="bg-background min-h-screen pt-24 pb-16">
            <PageTitle
                title="Contact Us"
                description="Get in touch with Wandeazy or tell us about your dream trip and we'll craft the perfect itinerary."
            />
            <Container>
                <div className="text-center max-w-2xl mx-auto mb-12">
                    <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">Let's plan your next trip</h1>
                    <p className="text-lg text-muted-foreground">
                        Tell us where you'd like to go and when. Our travel specialists will get back to you with a
                        tailored plan.
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
                    </div>

                    {/* Form */}
                    <div className="lg:col-span-2 bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
                        {submitted ? (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                                </div>
                                <h2 className="text-2xl font-bold mb-2">Thank you!</h2>
                                <p className="text-muted-foreground mb-6">
                                    Your inquiry is on its way. We'll reach out within 24 hours.
                                </p>
                                <Button variant="outline" onClick={() => { setSubmitted(false); setTravelDate(undefined); setForm({ fullName: '', email: '', phoneNumber: '', preferredTravelDate: '', numberOfTravelers: 1, message: '' }); }}>
                                    Send another inquiry
                                </Button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="fullName">Full name *</Label>
                                        <Input id="fullName" value={form.fullName} onChange={(e) => update('fullName', e.target.value)} required />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="email">Email *</Label>
                                        <Input id="email" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} required />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="phone">Phone *</Label>
                                        <Input id="phone" type="tel" value={form.phoneNumber} onChange={(e) => update('phoneNumber', e.target.value)} required />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="travelers">Number of travelers *</Label>
                                        <Input
                                            id="travelers"
                                            type="number"
                                            min={1}
                                            value={form.numberOfTravelers}
                                            onChange={(e) => update('numberOfTravelers', Math.max(1, parseInt(e.target.value) || 1))}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="travelDate">Preferred travel date *</Label>
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
                                                {travelDate ? format(travelDate, "PPP") : <span>Pick your travel date</span>}
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
                                <div className="space-y-1.5">
                                    <Label htmlFor="message">Message</Label>
                                    <Textarea
                                        id="message"
                                        rows={4}
                                        placeholder="Tell us about your dream trip…"
                                        value={form.message}
                                        onChange={(e) => update('message', e.target.value)}
                                    />
                                </div>
                                <Button type="submit" variant="brand" size="lg" disabled={createInquiry.isPending} className="w-full md:w-auto">
                                    {createInquiry.isPending ? (
                                        <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Sending…</>
                                    ) : (
                                        <><Send className="w-4 h-4 mr-2" /> Send Inquiry</>
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
        <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            {href ? (
                <a href={href} className="font-medium hover:text-brand-orange transition-colors break-words">{value}</a>
            ) : (
                <p className="font-medium break-words">{value}</p>
            )}
        </div>
    </div>
);
