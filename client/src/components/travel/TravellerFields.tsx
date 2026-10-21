import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Traveller } from '@/types/travel';

interface Props {
    index: number;
    value: Traveller;
    onChange: (t: Traveller) => void;
    needsPassport: boolean;
    heading: string;
}

const selectClass = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm';

export const TravellerFields = ({ index, value, onChange, needsPassport, heading }: Props) => {
    const set = (patch: Partial<Traveller>) => onChange({ ...value, ...patch });
    const id = (f: string) => `traveller-${index}-${f}`;

    return (
        <fieldset className="rounded-3xl bg-slate-50 p-5">
            <legend className="sr-only">{heading}</legend>
            <p className="flex items-center gap-3 mb-4 font-bold text-brand-blue">
                <span aria-hidden="true" className="w-9 h-9 rounded-full bg-brand-orange text-white flex items-center justify-center text-sm">{index + 1}</span>
                {heading}
            </p>
            <div className="grid sm:grid-cols-[110px_1fr_1fr] gap-3">
                <div className="space-y-1.5">
                    <Label htmlFor={id('title')}>Title</Label>
                    <select id={id('title')} value={value.title} onChange={(e) => set({ title: e.target.value as Traveller['title'] })} className={selectClass}>
                        {['Mr', 'Ms', 'Mrs', 'Mx'].map((t) => <option key={t}>{t}</option>)}
                    </select>
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor={id('first')}>First name</Label>
                    <Input id={id('first')} autoComplete="given-name" value={value.firstName} onChange={(e) => set({ firstName: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor={id('last')}>Last name</Label>
                    <Input id={id('last')} autoComplete="family-name" value={value.lastName} onChange={(e) => set({ lastName: e.target.value })} required />
                </div>
            </div>
            {needsPassport && (
                <div className="mt-3 grid sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                        <Label htmlFor={id('passport')}>Passport number</Label>
                        <Input id={id('passport')} value={value.passportNumber || ''} onChange={(e) => set({ passportNumber: e.target.value.toUpperCase() })} required />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor={id('expiry')}>Passport expiry</Label>
                        <Input id={id('expiry')} type="date" value={value.passportExpiry || ''} onChange={(e) => set({ passportExpiry: e.target.value })} required />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor={id('nationality')}>Nationality</Label>
                        <Input id={id('nationality')} placeholder="e.g. Indian" value={value.nationality || ''} onChange={(e) => set({ nationality: e.target.value })} required />
                    </div>
                </div>
            )}
        </fieldset>
    );
};
