export interface Alert {
    id: string;
    patientId: string;
    sessionId: string;
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
    category: 'ADEQUACY' | 'HEMODYNAMIC' | 'WEIGHT' | 'COMPLICATION' | 'GLOBAL';
    title: string;
    message: string;
    status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';
    createdAt: string;
}