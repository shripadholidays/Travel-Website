import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface SortSelectProps {
    onSortChange: (value: string) => void;
}

export const SortSelect = ({ onSortChange }: SortSelectProps) => {
    return (
        <Select onValueChange={onSortChange} defaultValue="recommended">
            <SelectTrigger className="w-[180px] bg-background">
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
