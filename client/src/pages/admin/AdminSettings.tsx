import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Facebook, Instagram, Twitter, Save, Loader2 } from "lucide-react";
import { useSiteSettings, useUpdateSiteSettings } from "@/hooks/use-settings";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { BookingServicesCard } from "@/components/admin/BookingServicesCard";

export const AdminSettings = () => {
    const { data, isLoading } = useSiteSettings();
    const updateSettings = useUpdateSiteSettings();

    const settings = data?.settings;

    const [companyName, setCompanyName] = useState("");
    const [contactEmail, setContactEmail] = useState("");
    const [contactPhone, setContactPhone] = useState("");
    const [address, setAddress] = useState("");
    const [facebook, setFacebook] = useState("");
    const [instagram, setInstagram] = useState("");
    const [twitter, setTwitter] = useState("");
    const [showQuickLinks, setShowQuickLinks] = useState(true);
    const [showNewsletter, setShowNewsletter] = useState(true);
    const [copyrightText, setCopyrightText] = useState("");

    useEffect(() => {
        if (settings) {
            setCompanyName(settings.companyName);
            setContactEmail(settings.contactEmail);
            setContactPhone(settings.contactPhone);
            setAddress(settings.address);
            setFacebook(settings.socialLinks.facebook);
            setInstagram(settings.socialLinks.instagram);
            setTwitter(settings.socialLinks.twitter);
            setShowQuickLinks(settings.footer.showQuickLinks);
            setShowNewsletter(settings.footer.showNewsletter);
            setCopyrightText(settings.footer.copyrightText);
        }
    }, [settings]);

    const handleSaveCompany = async () => {
        const toastId = toast.loading("Saving company details...");
        try {
            await updateSettings.mutateAsync({ companyName, contactEmail, contactPhone, address });
            toast.success("Company details saved", { id: toastId });
        } catch {
            toast.error("Failed to save", { id: toastId });
        }
    };

    const handleSaveFooter = async () => {
        const toastId = toast.loading("Saving footer settings...");
        try {
            await updateSettings.mutateAsync({
                socialLinks: { facebook, instagram, twitter },
                footer: { showQuickLinks, showNewsletter, copyrightText },
            });
            toast.success("Footer settings saved", { id: toastId });
        } catch {
            toast.error("Failed to save", { id: toastId });
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-72 mt-2" /></div>
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-80 w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-display font-bold tracking-tight text-brand-blue">Settings</h2>
                <p className="text-muted-foreground">Manage your website's global configurations and footer details.</p>
            </div>

            <div className="grid gap-6">
                <BookingServicesCard settings={settings} />

                <Card>
                    <CardHeader>
                        <CardTitle>Company Details</CardTitle>
                        <CardDescription>This information will be displayed in the Footer and Contact sections.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="companyName">Company Name</Label>
                            <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="email">Public Contact Email</Label>
                                <Input id="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="phone">Contact Phone</Label>
                                <Input id="phone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="address">Physical Address</Label>
                            <Textarea id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
                        </div>
                    </CardContent>
                    <CardFooter className="border-t px-6 py-4">
                        <Button onClick={handleSaveCompany} disabled={updateSettings.isPending} className="ml-auto gap-2 bg-brand-blue">
                            {updateSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save Changes
                        </Button>
                    </CardFooter>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Footer Configuration</CardTitle>
                        <CardDescription>Manage social links and footer visibility.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <h4 className="text-sm font-medium">Social Media Links</h4>
                            <div className="grid gap-3">
                                <div className="flex items-center gap-3">
                                    <Facebook className="w-5 h-5 text-blue-600" />
                                    <Input placeholder="Facebook Profile URL" value={facebook} onChange={(e) => setFacebook(e.target.value)} />
                                </div>
                                <div className="flex items-center gap-3">
                                    <Instagram className="w-5 h-5 text-pink-600" />
                                    <Input placeholder="Instagram Profile URL" value={instagram} onChange={(e) => setInstagram(e.target.value)} />
                                </div>
                                <div className="flex items-center gap-3">
                                    <Twitter className="w-5 h-5 text-sky-500" />
                                    <Input placeholder="Twitter Profile URL" value={twitter} onChange={(e) => setTwitter(e.target.value)} />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t">
                            <h4 className="text-sm font-medium">Footer Sections</h4>
                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Show "Quick Links"</Label>
                                    <p className="text-sm text-muted-foreground">Display standard navigation links in the footer.</p>
                                </div>
                                <Switch checked={showQuickLinks} onCheckedChange={setShowQuickLinks} />
                            </div>
                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Show "Newsletter"</Label>
                                    <p className="text-sm text-muted-foreground">Display the email subscription form.</p>
                                </div>
                                <Switch checked={showNewsletter} onCheckedChange={setShowNewsletter} />
                            </div>
                        </div>

                        <div className="grid gap-2 pt-4">
                            <Label htmlFor="copyright">Copyright Text</Label>
                            <Input id="copyright" value={copyrightText} onChange={(e) => setCopyrightText(e.target.value)} />
                        </div>
                    </CardContent>
                    <CardFooter className="border-t px-6 py-4">
                        <Button onClick={handleSaveFooter} disabled={updateSettings.isPending} className="ml-auto gap-2 bg-brand-blue">
                            {updateSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Update Footer
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
};
