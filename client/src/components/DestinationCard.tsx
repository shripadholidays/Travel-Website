import { Link } from "react-router-dom";
import { Image } from "@/components/ui/image";
import { ArrowUpRight } from "lucide-react";
import type { Destination } from "@/types";

export const DestinationCard = ({ dest }: { dest: Destination }) => (
    <Link to={`/destinations/${dest.slug}`} className="block relative group overflow-hidden rounded-3xl cursor-pointer h-full">
        <div className="absolute inset-0 bg-brand-dark/20 group-hover:bg-brand-dark/10 transition-colors z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-20" />

        <Image
            src={dest.coverImage}
            alt={dest.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />

        <div className="absolute bottom-6 left-6 z-30">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-orange bg-white/10 backdrop-blur-md px-2 py-1 rounded-full mb-2 inline-block">
                {dest.tourCount}+ Tours
            </span>
            <h3 className="font-bold text-white text-xl leading-tight">
                {dest.name}
            </h3>
        </div>

        <div className="absolute top-6 right-6 z-30 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-4 group-hover:translate-x-0">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white">
                <ArrowUpRight className="w-5 h-5" />
            </div>
        </div>
    </Link>
);
