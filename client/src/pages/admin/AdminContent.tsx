import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Layout, Image as ImageIcon, Sparkles, MessageSquare, Loader2 } from "lucide-react";
import { useSiteSettings, useToggleSection } from "@/hooks/use-settings";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

const SECTION_ICONS: Record<string, React.ElementType> = {
    hero: Layout,
    featured: Sparkles,
    offers: Sparkles,
    testimonials: MessageSquare,
    gallery: ImageIcon,
};

export const AdminContent = () => {
    const { data, isLoading } = useSiteSettings();
    const toggleSection = useToggleSection();
    const [togglingId, setTogglingId] = useState<string | null>(null);

    const sections = data?.settings?.contentSections ?? [];

    const handleToggle = async (sectionId: string, currentVisible: boolean) => {
        setTogglingId(sectionId);
        try {
            await toggleSection.mutateAsync({ sectionId, isVisible: !currentVisible });
            toast.success(`Section ${currentVisible ? 'hidden' : 'visible'} successfully`);
        } catch {
            toast.error("Failed to update section status");
        } finally {
            setTogglingId(null);
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-72 mt-2" /></div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-48" />)}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-display font-bold tracking-tight text-brand-blue">Content & Offers</h2>
                    <p className="text-muted-foreground">Show or hide homepage sections. Edit the underlying content from Tours, Destinations, Blog, and Settings.</p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {sections.map((section) => {
                    const Icon = SECTION_ICONS[section.sectionId] || Layout;
                    return (
                        <Card key={section.sectionId} className="hover:shadow-md transition-shadow">
                            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                                <CardTitle className="text-lg font-medium">
                                    <div className="flex items-center gap-2">
                                        <Icon className="w-5 h-5 text-brand-orange" />
                                        {section.name}
                                    </div>
                                </CardTitle>
                                <div className="flex items-center gap-2">
                                    {togglingId === section.sectionId && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                                    <Switch
                                        checked={section.isVisible}
                                        disabled={togglingId === section.sectionId}
                                        onCheckedChange={() => handleToggle(section.sectionId, section.isVisible)}
                                    />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <CardDescription className="mb-4 h-10">
                                    {section.description}
                                </CardDescription>
                                <div className="flex items-center justify-between text-sm">
                                    <Badge variant={section.isVisible ? "default" : "secondary"}>
                                        {section.isVisible ? "Visible" : "Hidden"}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                        Toggle to show/hide on homepage
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};
