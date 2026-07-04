import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { useCollections } from "@/hooks/use-collections";
import { Link } from "react-router-dom";
import { Image } from "@/components/ui/image";
import { Spinner } from "@/components/ui/spinner";

import { Container } from "@/components/ui/container";

export const Collections = () => {
    const { data, isLoading } = useCollections();
    const collections = data?.collections ?? [];

    return (
        <section className="py-24 bg-white">
            <Container>
                <div className="flex justify-between items-end mb-12">
                    <div>
                        <h2 className="text-4xl md:text-5xl font-display font-bold mb-4 text-brand-blue">Curated Collections</h2>
                        <p className="text-muted-foreground text-lg max-w-xl">
                            Hand-picked experiences grouped by the way you love to travel.
                        </p>
                    </div>
                    <Link to="/collections" className="hidden md:flex items-center gap-2 text-brand-orange font-medium hover:gap-4 transition-all whitespace-nowrap">
                        View all <ArrowUpRight className="w-5 h-5" />
                    </Link>
                </div>

                {isLoading ? (
                    <Spinner center />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {collections.map((item, i) => (
                            <Link to={`/collections/${item.slug}`} key={item._id} className={i === 0 ? "md:col-span-2" : ""}>
                                <motion.div
                                    initial={{ opacity: 0, y: 50 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="group relative h-80 rounded-3xl overflow-hidden cursor-pointer"
                                >
                                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors z-10" />
                                    <Image
                                        src={item.coverImage}
                                        alt={item.name}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 flex flex-col justify-end p-8 z-20 bg-gradient-to-t from-black/80 to-transparent">
                                        <h3 className="text-3xl font-display font-bold text-white mb-2">{item.name}</h3>
                                        <div className="flex items-center justify-between">
                                            <p className="text-white/80 line-clamp-1">{item.description}</p>
                                            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                                <ArrowUpRight className="w-5 h-5" />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            </Link>
                        ))}
                    </div>
                )}
            </Container>
        </section>
    );
};
