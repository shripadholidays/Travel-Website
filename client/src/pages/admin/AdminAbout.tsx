import { useState, useEffect } from 'react';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { PageHeader } from '@/components/admin/AdminUI';
import { toast } from 'sonner';
import { Save, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ImagePicker } from '@/components/ui/ImagePicker';
import { ListEditor } from '@/components/ui/ListEditor';
import { useSiteSettings, useUpdateSiteSettings, type AboutStat, type AboutValue } from '@/hooks/use-settings';

const ICON_OPTIONS = [
    'Globe2', 'ShieldCheck', 'Heart', 'Users', 'Star', 'Award', 'Zap',
    'Map', 'Camera', 'Compass', 'Plane', 'Coffee', 'Headphones', 'MessageCircle',
];

function SaveBtn({ onClick, loading, disabled }: { onClick: () => void; loading: boolean; disabled?: boolean }) {
    return (
        <Button onClick={onClick} disabled={loading || disabled} className="ml-auto gap-2 bg-brand-blue hover:bg-brand-blue/90">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
        </Button>
    );
}

export const AdminAbout = () => {
    const { data, isLoading } = useSiteSettings();
    const update = useUpdateSiteSettings();
    const about = data?.settings?.aboutPage;

    const [heroImage, setHeroImage] = useState('');
    const [heroHeadline, setHeroHeadline] = useState('');
    const [heroSubtext, setHeroSubtext] = useState('');
    const [storyParagraph1, setStoryParagraph1] = useState('');
    const [storyParagraph2, setStoryParagraph2] = useState('');
    const [stats, setStats] = useState<AboutStat[]>([]);
    const [values, setValues] = useState<AboutValue[]>([]);
    const [ctaHeading, setCtaHeading] = useState('');
    const [ctaSubtext, setCtaSubtext] = useState('');
    const [ctaBtn1Label, setCtaBtn1Label] = useState('');
    const [ctaBtn1Link, setCtaBtn1Link] = useState('');
    const [ctaBtn2Label, setCtaBtn2Label] = useState('');
    const [ctaBtn2Link, setCtaBtn2Link] = useState('');
    const [saved, setSaved] = useState('');

    useEffect(() => {
        if (!about) return;
        setHeroImage(about.heroImage || '');
        setHeroHeadline(about.heroHeadline || '');
        setHeroSubtext(about.heroSubtext || '');
        setStoryParagraph1(about.storyParagraph1 || '');
        setStoryParagraph2(about.storyParagraph2 || '');
        setStats(about.stats || []);
        setValues(about.values || []);
        setCtaHeading(about.ctaHeading || '');
        setCtaSubtext(about.ctaSubtext || '');
        setCtaBtn1Label(about.ctaBtn1Label || '');
        setCtaBtn1Link(about.ctaBtn1Link || '');
        setCtaBtn2Label(about.ctaBtn2Label || '');
        setCtaBtn2Link(about.ctaBtn2Link || '');
        setSaved(JSON.stringify({
            aboutPage: {
                heroImage: about.heroImage || '', heroHeadline: about.heroHeadline || '', heroSubtext: about.heroSubtext || '',
                storyParagraph1: about.storyParagraph1 || '', storyParagraph2: about.storyParagraph2 || '',
                stats: about.stats || [], values: about.values || [],
                ctaHeading: about.ctaHeading || '', ctaSubtext: about.ctaSubtext || '',
                ctaBtn1Label: about.ctaBtn1Label || '', ctaBtn1Link: about.ctaBtn1Link || '', ctaBtn2Label: about.ctaBtn2Label || '', ctaBtn2Link: about.ctaBtn2Link || '',
            },
        }));
    }, [about]);

    const buildPayload = () => ({
        aboutPage: {
            heroImage, heroHeadline, heroSubtext,
            storyParagraph1, storyParagraph2,
            stats, values,
            ctaHeading, ctaSubtext,
            ctaBtn1Label, ctaBtn1Link, ctaBtn2Label, ctaBtn2Link,
        },
    });

    const dirty = !!saved && JSON.stringify(buildPayload()) !== saved;
    const leaveGuard = useUnsavedChanges(dirty);

    const save = async () => {
        const id = toast.loading('Saving about page…');
        try {
            const payload = buildPayload();
            await update.mutateAsync(payload);
            setSaved(JSON.stringify(payload));
            toast.success('About page saved', { id });
        } catch (err) {
            toast.error((err as Error).message || 'Failed to save', { id });
        }
    };

    if (isLoading) return (
        <div className="space-y-6">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-96 w-full" />
        </div>
    );

    return (
        <div className="space-y-6">
            {leaveGuard.dialog}
            <PageHeader
                title="About Page"
                description="The About Us page: hero, story, numbers, values and the closing call to action."
                actions={<>
                    <Button variant="ghost" size="sm" asChild><a href="/about" target="_blank" rel="noopener noreferrer">View page</a></Button>
                    <SaveBtn onClick={save} loading={update.isPending} disabled={!dirty} />
                </>}
            />

            {/* Hero Section */}
            <Card>
                <CardHeader>
                    <CardTitle>Hero Section</CardTitle>
                    <CardDescription>Full-width banner at the top of the About page.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <ImagePicker label="Hero Background Image" value={heroImage} onChange={setHeroImage} />
                    <div className="space-y-1.5">
                        <Label>Headline</Label>
                        <Textarea value={heroHeadline} onChange={e => setHeroHeadline(e.target.value)} rows={2}
                            placeholder="We turn wanderlust into unforgettable journeys" />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Subtext</Label>
                        <Textarea value={heroSubtext} onChange={e => setHeroSubtext(e.target.value)} rows={2}
                            placeholder="Wandeazy was born from a simple belief…" />
                    </div>
                </CardContent>
            </Card>

            {/* Story Section */}
            <Card>
                <CardHeader>
                    <CardTitle>Our Story</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                        <Label>Paragraph 1</Label>
                        <Textarea value={storyParagraph1} onChange={e => setStoryParagraph1(e.target.value)} rows={4} />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Paragraph 2 (optional)</Label>
                        <Textarea value={storyParagraph2} onChange={e => setStoryParagraph2(e.target.value)} rows={3} />
                    </div>
                </CardContent>
            </Card>

            {/* Stats */}
            <Card>
                <CardHeader>
                    <CardTitle>Stats / Numbers</CardTitle>
                    <CardDescription>Leave empty to show live numbers worked out from your real tours, bookings and reviews.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ListEditor
                        items={stats}
                        onChange={setStats}
                        addLabel="Add stat"
                        maxItems={6}
                        createEmpty={() => ({ value: '', label: '' })}
                        renderItem={(stat, _i, onChange) => (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs">Value</Label>
                                    <Input value={stat.value} onChange={e => onChange({ ...stat, value: e.target.value })} placeholder="e.g. 25" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Label</Label>
                                    <Input value={stat.label} onChange={e => onChange({ ...stat, label: e.target.value })} placeholder="Happy travelers" />
                                </div>
                            </div>
                        )}
                    />
                </CardContent>
            </Card>

            {/* Values */}
            <Card>
                <CardHeader>
                    <CardTitle>Values / Why Travel With Us</CardTitle>
                </CardHeader>
                <CardContent>
                    <ListEditor
                        items={values}
                        onChange={setValues}
                        addLabel="Add value card"
                        maxItems={8}
                        createEmpty={() => ({ icon: 'Globe2', title: '', description: '' })}
                        renderItem={(v, _i, onChange) => (
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Icon</Label>
                                        <Select value={v.icon} onValueChange={val => onChange({ ...v, icon: val })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>{ICON_OPTIONS.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Title</Label>
                                        <Input value={v.title} onChange={e => onChange({ ...v, title: e.target.value })} />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Description</Label>
                                    <Textarea value={v.description} onChange={e => onChange({ ...v, description: e.target.value })} rows={2} />
                                </div>
                            </div>
                        )}
                    />
                </CardContent>
            </Card>

            {/* CTA */}
            <Card>
                <CardHeader>
                    <CardTitle>Call to Action Banner</CardTitle>
                    <CardDescription>The dark blue CTA block at the bottom of the page.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                        <Label>Heading</Label>
                        <Input value={ctaHeading} onChange={e => setCtaHeading(e.target.value)} placeholder="Ready to start your journey?" />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Subtext</Label>
                        <Textarea value={ctaSubtext} onChange={e => setCtaSubtext(e.target.value)} rows={2} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label>Button 1 Label</Label>
                            <Input value={ctaBtn1Label} onChange={e => setCtaBtn1Label(e.target.value)} placeholder="Explore Tours" />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Button 1 Link</Label>
                            <Input value={ctaBtn1Link} onChange={e => setCtaBtn1Link(e.target.value)} placeholder="/tours" />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Button 2 Label</Label>
                            <Input value={ctaBtn2Label} onChange={e => setCtaBtn2Label(e.target.value)} placeholder="Plan My Trip" />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Button 2 Link</Label>
                            <Input value={ctaBtn2Link} onChange={e => setCtaBtn2Link(e.target.value)} placeholder="/contact" />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="border-t px-6 py-4">
                    <SaveBtn onClick={save} loading={update.isPending} disabled={!dirty} />
                </CardFooter>
            </Card>
        </div>
    );
};
