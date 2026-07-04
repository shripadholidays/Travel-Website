import { Star, Clock, MapPin, ArrowUpRight, Heart } from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";
import { Image } from "@/components/ui/image";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useWishlist, useAddToWishlist, useRemoveFromWishlist } from "@/hooks/use-wishlist";
import { useAuth } from "@/context/AuthContext";
import type { Tour } from "@/types";

export const TourCard = ({ tour, className }: { tour: Tour, className?: string }) => {
    const { formatPrice } = useCurrency();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { data: wishlistData } = useWishlist();
    const addToWishlist = useAddToWishlist();
    const removeFromWishlist = useRemoveFromWishlist();
    const isWishlisted = !!wishlistData?.wishlist?.tours?.some((t) => t._id === tour._id);

    const toggleWishlist = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) {
            toast.error('Please sign in to save tours.');
            navigate('/login');
            return;
        }
        if (isWishlisted) {
            removeFromWishlist.mutate(tour._id, { onSuccess: () => toast.success('Removed from wishlist.') });
        } else {
            addToWishlist.mutate(tour._id, { onSuccess: () => toast.success('Added to wishlist!') });
        }
    };

    const durationLabel = `${tour.duration.days}D/${tour.duration.nights}N`;
    const rating = tour.reviews?.rating ?? 0;
    const reviewCount = tour.reviews?.basedOn ?? 0;
    const tags = tour.categories ?? [];
    const image = tour.imageURL || tour.images?.[0] || '';

    // EMI/offer discount logic
    let finalPrice = tour.price;
    let isSale = false;
    let saleLabel = "";

    if (tour.emi) {
        const percentMatch = tour.emi.match(/(\d+)%\s+OFF/i);
        const flatMatch = tour.emi.match(/\$(\d+)\s+OFF/i);
        const saleMatch = tour.emi.match(/(sale|deal|offer|special)/i);

        if (percentMatch) {
            finalPrice = tour.price * (1 - parseInt(percentMatch[1]) / 100);
        } else if (flatMatch) {
            finalPrice = tour.price - parseInt(flatMatch[1]);
        }

        if (saleMatch) {
            isSale = true;
            saleLabel = tour.emi.replace(/\s*(\d+%|\$\d+)\s+OFF.*/i, "").trim();
            if (!saleLabel) saleLabel = "Special Offer";
        }
    }

    const hasDiscount = finalPrice < tour.price;

    return (
        <Link to={`/tour/${tour._id}`} className={cn("group block h-full", className)}>
            <div className="relative h-full flex flex-col bg-white rounded-[2rem] overflow-hidden border border-slate-100 shadow-sm transition-[transform,box-shadow] duration-500 ease-out transform-gpu [backface-visibility:hidden] hover:shadow-2xl hover:shadow-brand-blue/10 hover:-translate-y-1.5">

                {/* Image Section */}
                <div className="relative h-[280px] w-full p-3 pb-0">
                    <div className="w-full h-full rounded-[1.5rem] overflow-hidden relative transform-gpu [backface-visibility:hidden]">
                        <Image
                            src={image}
                            alt={tour.title}
                            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110 transform-gpu"
                        />
                        {/* Stronger bottom gradient for the floating badges */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/20" />

                        {/* Tags */}
                        <div className="absolute top-4 left-4 flex flex-wrap gap-2 max-w-[75%]">
                            {tags.slice(0, 2).map((tag, i) => (
                                <span key={tag} className={cn(
                                    "text-[10px] font-bold tracking-wider uppercase px-3 py-1.5 rounded-full shadow-lg backdrop-blur-md",
                                    i === 0 ? "bg-white/95 text-brand-blue" : "bg-brand-orange text-white"
                                )}>
                                    {tag}
                                </span>
                            ))}
                        </div>

                        {/* Wishlist Button */}
                        <button
                            onClick={toggleWishlist}
                            disabled={addToWishlist.isPending || removeFromWishlist.isPending}
                            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                            aria-pressed={isWishlisted}
                            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/95 backdrop-blur-md flex items-center justify-center shadow-md hover:scale-110 active:scale-95 transition-transform group/heart"
                        >
                            <Heart className={cn(
                                "w-[18px] h-[18px] transition-colors",
                                isWishlisted ? "text-red-500 fill-red-500" : "text-slate-600 group-hover/heart:text-red-500"
                            )} />
                        </button>

                        {/* Duration badge (floating, bottom-left) */}
                        <div className="absolute bottom-4 left-4 flex items-center gap-1.5 bg-white/95 backdrop-blur-md text-brand-blue text-xs font-bold px-3 py-1.5 rounded-full shadow-md">
                            <Clock className="w-3.5 h-3.5 text-brand-orange" />
                            {durationLabel}
                        </div>

                        {/* Rating badge (floating, bottom-right) */}
                        {rating > 0 && (
                            <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-brand-blue/90 backdrop-blur-md text-white text-xs font-bold px-2.5 py-1.5 rounded-full shadow-md">
                                <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                                {rating}
                            </div>
                        )}
                    </div>
                </div>

                {/* Content Section */}
                <div className="p-6 pt-5 flex flex-col flex-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-orange mb-2.5">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{tour.location}</span>
                    </div>

                    <h3 className="text-xl font-display font-bold leading-tight mb-2.5 group-hover:text-brand-orange transition-colors line-clamp-2">
                        {tour.title}
                    </h3>

                    <div className="flex items-center gap-1.5 mb-6 text-sm">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        <span className="font-bold text-slate-800">{rating}</span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-muted-foreground">{reviewCount} reviews</span>
                    </div>

                    <div className="mt-auto flex items-end justify-between pt-5 border-t border-slate-100">
                        <div className="flex flex-col">
                            {isSale ? (
                                <span className="text-[10px] font-bold uppercase text-red-500 tracking-wider mb-0.5">
                                    {saleLabel}
                                </span>
                            ) : (
                                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">Starting from</span>
                            )}

                            <div className="flex items-baseline gap-1.5">
                                {hasDiscount && (
                                    <span className="text-sm font-bold text-muted-foreground/60 line-through decoration-red-500/50">
                                        {formatPrice(tour.price)}
                                    </span>
                                )}
                                <span className={cn("text-[26px] leading-none font-bold font-display", isSale ? "text-red-600" : "text-brand-blue")}>
                                    {formatPrice(hasDiscount ? finalPrice : tour.price)}
                                </span>
                                <span className="text-xs text-muted-foreground font-medium">/ person</span>
                            </div>
                        </div>

                        <div
                            aria-hidden="true"
                            className="w-11 h-11 rounded-full bg-slate-50 flex items-center justify-center text-brand-blue group-hover:bg-brand-orange group-hover:text-white transition-all duration-300 shrink-0"
                        >
                            <ArrowUpRight className="w-5 h-5 transition-transform group-hover:rotate-45" />
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
};
