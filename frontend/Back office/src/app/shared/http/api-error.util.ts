import { HttpErrorResponse } from '@angular/common/http';
import { ApiErrorResponse } from './api-error';

export function extractApiMessages(err: unknown): string[] {
    if (!(err instanceof HttpErrorResponse)) return ['Unexpected error'];

    const body = err.error as ApiErrorResponse | string | null;

    if (body && typeof body === 'object' && Array.isArray(body.messages) && body.messages.length) {
        return body.messages;
    }

    if (typeof body === 'string' && body.trim().length) return [body];

    if (err.message) return [err.message];

    return ['Request failed'];
}