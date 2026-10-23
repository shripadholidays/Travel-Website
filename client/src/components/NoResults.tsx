import { Link } from "react-router-dom";
import { MessageCircle, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TourCard } from "@/components/TourCard";
import { useTours } from "@/hooks/use-tours";

interface NoResultsProps {
    title: string;
    message: string;
    /** What the visitor searched for; passed on so the team knows what they wanted */
    query?: string;
    onClear?: () => void;
    clearLabel?: string;
    /** Show a few popular tours underneath, so the page is never a dead end */
    suggestTours?: boolean;
}

/** Empty search state with a way forward: clear filters, ask the team, or see popular tours. */
export const NoResults = ({ title, message, query, onClear, clearLabel = "Clear filters", suggestTours }: NoResultsProps) => {
    const { data } = useTours({ sort: "rating", limit: 3 }, { enabled: !!suggestTours });
    const popular = data?.tours ?? [];
    const about = query?.trim();
    const contactLink = `/contact?topic=trip&source=no-results${about ? `&about=${encodeURIComponent(about)}` : ""}`;

    return (
        <div>
            <div className="rounded-[2rem] bg-slate-50 border border-slate-100 px-6 py-12 text-center">
                <div className="w-14 h-14 rounded-full bg-brand-orange/10 flex items-center justify-center mx-auto mb-4">
                    <SearchX className="w-7 h-7 text-brand-orange" />
                </div>
                <h3 className="text-2xl font-display font-bold text-brand-blue">{title}</h3>
                <p className="mt-2 text-muted-foreground max-w-md mx-auto">{message}</p>
                <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                    {onClear && <Button variant="outline" onClick={onClear}>{clearLabel}</Button>}
                    <Button variant="brand" asChild>
                        <Link to={contactLink}>
                            <MessageCircle className="w-4 h-4 mr-2" />
                            {about ? `Ask us to plan ${about.length > 24 ? "it" : about}` : "Ask us to plan it"}
                        </Link>
                    </Button>
                </div>
            </div>

            {suggestTours && popular.length > 0 && (
                <div className="mt-12">
                    <h4 className="text-xl font-display font-bold text-brand-blue mb-6">Popular with travellers</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {popular.map((tour) => <TourCard key={tour._id} tour={tour} />)}
                    </div>
                </div>
            )}
        </div>
    );
};
