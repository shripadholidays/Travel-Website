import { useMutation } from '@tanstack/react-query';
import { api } from '@/services/api';

export interface InquiryInput {
    fullName: string;
    email: string;
    phoneNumber: string;
    preferredTravelDate: string;
    numberOfTravelers: number;
    message?: string;
}

/** POST /inquiries — "Plan your trip" lead / contact form submission. */
export function useCreateInquiry() {
    return useMutation({
        mutationFn: (data: InquiryInput) => api.post('/inquiries', data),
    });
}

/** POST /subscribe — newsletter signup. */
export function useSubscribeNewsletter() {
    return useMutation({
        mutationFn: (email: string) => api.post('/subscribe', { email }),
    });
}
