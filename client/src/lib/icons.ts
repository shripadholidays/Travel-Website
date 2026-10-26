// Icons an admin can choose by name for homepage and About-page cards.
// Listed one by one: `import * as` the whole of lucide-react put every icon
// (over a thousand) into the main bundle that every visitor downloads.
import {
    Award, Calendar, Camera, CheckCircle2, Clock, Coffee, Compass, Globe2, Headphones, Heart, HelpCircle,
    Hotel, Map, MessageCircle, Plane, Route, Settings, ShieldCheck, Star, Users, Zap, Car, Utensils, Mountain, Sparkles,
    type LucideIcon,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
    Award, Calendar, Camera, CheckCircle2, Clock, Coffee, Compass, Globe2, Headphones, Heart,
    Hotel, Map, MessageCircle, Plane, Route, Settings, ShieldCheck, Star, Users, Zap, Car, Utensils, Mountain, Sparkles,
};

/** Names offered in the admin icon pickers */
export const ICON_NAMES = Object.keys(ICONS);

/** Icon component for a stored name; a question mark for anything unknown. */
export function resolveIcon(name: string): LucideIcon {
    return ICONS[name] ?? HelpCircle;
}
