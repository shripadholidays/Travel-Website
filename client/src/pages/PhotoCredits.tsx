import { Container } from "@/components/ui/container";
import { PageTitle } from "@/components/PageTitle";
import credits from "@/data/photo-credits.json";

interface Credit { subject: string; title: string; artist: string; licence: string; page: string }

/** Who took the destination photos, and the free licence each one is shared under */
export const PhotoCreditsPage = () => {
    const list = (credits as Credit[]).slice().sort((a, b) => a.subject.localeCompare(b.subject));
    return (
        <div className="bg-background min-h-screen pt-24 pb-16">
            <PageTitle
                title="Photo Credits"
                description="The destination photos on this site come from Wikimedia Commons and are shared under free licences. Here is who took each one."
            />
            <Container className="max-w-4xl">
                <h1 className="text-4xl md:text-5xl font-display font-bold mb-2">Photo credits</h1>
                <p className="text-muted-foreground mb-8 text-pretty max-w-2xl">
                    Our destination photos come from Wikimedia Commons. Each is free to use under the licence shown, and we thank the photographers
                    who share their work. Tap a photo's name to see the original and its full licence.
                </p>
                <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white">
                    {list.map((c) => (
                        <li key={c.page} className="px-4 py-3 text-sm flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                            <span className="min-w-0">
                                <span className="font-medium text-slate-900 capitalize">{c.subject}</span>
                                <span className="text-muted-foreground"> · </span>
                                <a href={c.page} target="_blank" rel="noopener noreferrer" className="text-brand-orange hover:underline break-words">{c.title}</a>
                            </span>
                            <span className="text-muted-foreground sm:text-right shrink-0">{c.artist || "Unknown author"} · {c.licence}</span>
                        </li>
                    ))}
                </ul>
            </Container>
        </div>
    );
};
