import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface SortSelectProps {
    onSortChange: (value: string) => void;
    value?: string;
}

export const SortSelect = ({ onSortChange, value = "recommended" }: SortSelectProps) => {
    return (
        <Select onValueChange={onSortChange} value={value}>
            <SelectTrigger className="w-[180px] bg-background" aria-label="Sort tours">
                <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="recommended">Recommended</SelectItem>
                <SelectItem value="price_low">Price: Low to High</SelectItem>
                <SelectItem value="price_high">Price: High to Low</SelectItem>
                <SelectItem value="rating">Top Rated</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
            </SelectContent>
        </Select>
    );
};
