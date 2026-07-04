import { useMutation } from '@tanstack/react-query';
import { API_BASE_URL } from '@/services/api';

async function uploadFile(file: File): Promise<{ url: string; filename: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
    });

    const json = await res.json();
    if (!res.ok || json.status !== 'success') {
        throw new Error(json.message || 'Upload failed');
    }
    return json.data;
}

export function useUploadFile() {
    return useMutation({ mutationFn: uploadFile });
}
