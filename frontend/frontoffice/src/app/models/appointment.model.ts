export interface Appointment {
  id: string;
  patientNom: string;
  patientMatricule: string;
  medecinId?: string;
  medecinNom: string;
  notes?: string;
  status: string;
  type: string;
  dateTime?: string;
  date?: string;
  sessionId?: string;

  // Added for UI compatibility
  medecinSpecialite?: string;
  appointmentDate?: string;
  previousDate?: string;
  durationMinutes?: number;
  reminderSent?: boolean;
}

export interface AppointmentRequest {
  patientNom: string;
  patientMatricule: string;
  medecinId?: string;
  medecinNom: string;
  notes?: string;
  type: string;
  dateTime?: string;
  date?: string;
}

export interface RescheduleRequest {
  newDateTime: string;
  reason?: string;
}

export interface AppointmentStatsDTO {
  // Add properties as required by backend
  totalAppointments: number;
  scheduled: number;
  completed: number;
  cancelled: number;
}
