export interface ApiErrorResponse {
    timestamp?: string;
    status?: number;
    error?: string;
    path?: string;
    messages?: string[];
}