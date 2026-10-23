import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";
import { useRecommendedTours } from "@/hooks/use-tours";
import { TourCard } from "@/components/TourCard";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

import { Container } from "@/components/ui/container";

export const FeaturedTours = () => {
    const prevRef = useRef<HTMLButtonElement>(null);
    const nextRef = useRef<HTMLButtonElement>(null);
    const { data, isLoading } = useRecommendedTours();
    const tours = data?.tours ?? [];

    return (
        <section className="py-24 bg-brand-light/30">
            <Container className="max-w-7xl px-4 md:px-6 lg:px-6">
                <div className="flex justify-between items-end mb-12">
                    <div>
                        <h2 className="text-4xl md:text-5xl font-display font-bold mb-4 text-brand-blue">Featured Tours</h2>
                        <p className="text-muted-foreground text-lg max-w-xl">
                            Handpicked adventures for your next getaway.
                        </p>
                        <Link to="/tours" className="md:hidden inline-flex items-center gap-2 text-brand-orange font-medium mt-4">
                            View all tours <ArrowUpRight className="w-4 h-4" />
                        </Link>
                    </div>

                    <div className="hidden md:flex items-center gap-4">
                        <Link to="/tours" className="flex items-center gap-2 text-brand-orange font-medium hover:gap-3 transition-all whitespace-nowrap">
                            View all <ArrowUpRight className="w-5 h-5" />
                        </Link>
                        <div className="flex gap-2">
                            <Button variant="outline" size="icon" className="rounded-full w-12 h-12 border-slate-200" ref={prevRef} aria-label="Previous tours">
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                            <Button variant="outline" size="icon" className="rounded-full w-12 h-12 border-slate-200 bg-white" ref={nextRef} aria-label="Next tours">
                                <ArrowRight className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>
                </div>

                {isLoading ? (
                    <Spinner center />
                ) : tours.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground">
                        <p>No featured tours available right now.</p>
                    </div>
                ) : (
                    <Swiper
                        modules={[Navigation, Pagination]}
                        spaceBetween={30}
                        slidesPerView={1}
                        navigation={{
                            prevEl: prevRef.current,
                            nextEl: nextRef.current,
                        }}
                        onBeforeInit={(swiper) => {
                            const nav = swiper.params.navigation;
                            if (nav && typeof nav !== 'boolean') {
                                nav.prevEl = prevRef.current;
                                nav.nextEl = nextRef.current;
                            }
                        }}
                        breakpoints={{
                            640: { slidesPerView: 2 },
                            1024: { slidesPerView: 3 },
                            1280: { slidesPerView: 4 },
                        }}
                        observer={true}
                        observeParents={true}
                        className="w-full py-10 !items-stretch"
                    >
                        {tours.map(tour => (
                            <SwiperSlide key={tour._id} className="!h-auto">
                                <TourCard tour={tour} className="h-full" />
                            </SwiperSlide>
                        ))}
                    </Swiper>
                )}
            </Container>
        </section>
    );
};
