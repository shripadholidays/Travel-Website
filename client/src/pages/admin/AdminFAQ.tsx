import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Save, Loader2, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ListEditor } from '@/components/ui/ListEditor';
import { JsonCsvImporter } from '@/components/ui/JsonCsvImporter';
import { useSiteSettings, useUpdateSiteSettings, type FAQ } from '@/hooks/use-settings';

export const AdminFAQ = () => {
    const { data, isLoading } = useSiteSettings();
    const update = useUpdateSiteSettings();
    const [faqs, setFaqs] = useState<FAQ[]>([]);
    const [importOpen, setImportOpen] = useState(false);

    useEffect(() => {
        if (data?.settings?.faqs) setFaqs(data.settings.faqs);
    }, [data]);

    const save = async () => {
        // Ensure orders are correct
        const ordered = faqs.map((f, i) => ({ ...f, order: i }));
        const toastId = toast.loading('Saving FAQs…');
        try {
            await update.mutateAsync({ faqs: ordered });
            toast.success('FAQs saved', { id: toastId });
        } catch {
            toast.error('Failed to save', { id: toastId });
        }
    };

    if (isLoading) return (
        <div className="space-y-6">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-96 w-full" />
        </div>
    );

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-display font-bold tracking-tight text-brand-blue">FAQ</h2>
                <p className="text-muted-foreground">Manage frequently asked questions shown on the homepage and FAQ page.</p>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div>
                            <CardTitle>Questions & Answers</CardTitle>
                            <CardDescription>
                                Order matters — items are displayed in the order shown here.
                                The homepage shows the first 5.
                            </CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setImportOpen(true)} className="gap-1.5">
                            <Download className="w-3.5 h-3.5" /> Import CSV / JSON
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <ListEditor
                        items={faqs}
                        onChange={setFaqs}
                        addLabel="Add FAQ"
                        createEmpty={() => ({ question: '', answer: '', order: faqs.length })}
                        renderItem={(faq, _i, onChange) => (
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <Label className="text-xs">Question</Label>
                                    <Input
                                        value={faq.question}
                                        onChange={e => onChange({ ...faq, question: e.target.value })}
                                        placeholder="How do I book a tour?"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Answer</Label>
                                    <Textarea
                                        value={faq.answer}
                                        onChange={e => onChange({ ...faq, answer: e.target.value })}
                                        rows={3}
                                        placeholder="Browse our tours, pick the one you love…"
                                    />
                                </div>
                            </div>
                        )}
                    />
                </CardContent>
                <CardFooter className="border-t px-6 py-4">
                    <Button onClick={save} disabled={update.isPending} className="ml-auto gap-2 bg-brand-blue hover:bg-brand-blue/90">
                        {update.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save FAQs
                    </Button>
                </CardFooter>
            </Card>

            <JsonCsvImporter
                open={importOpen}
                onOpenChange={setImportOpen}
                title="Import FAQs"
                schemaHint="Fields: question, answer"
                exampleJson={`[\n  {\n    "question": "How do I book a tour?",\n    "answer": "Browse our tours and complete checkout."\n  }\n]`}
                onImport={(rows) => {
                    const items: FAQ[] = rows.map((r, i) => ({
                        question: String(r.question ?? ''),
                        answer: String(r.answer ?? ''),
                        order: faqs.length + i,
                    }));
                    setFaqs(p => [...p, ...items]);
                    toast.success(`Added ${items.length} FAQs. Remember to save.`);
                }}
            />
        </div>
    );
};
