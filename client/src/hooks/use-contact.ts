import { useMutation } from '@tanstack/react-query';
import { api } from '@/services/api';

export type InquiryTopic = 'trip' | 'booking' | 'question' | 'other';
export type InquirySource = 'contact' | 'chat' | 'no-results' | 'tour' | 'destination';

export interface InquiryInput {
    fullName: string;
    email: string;
    phoneNumber?: string;
    preferredTravelDate?: string;
    numberOfTravelers?: number;
    message?: string;
    topic?: InquiryTopic;
    /** The tour, destination or search the traveller was looking at */
    context?: string;
    source?: InquirySource;
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
