export interface Alert {
  id: string;
  patientId: string;
  patientMatricule?: string;
  type: string;
  message: string;
  severity: string;
  resolved: boolean;
  handledBy?: string;
  createdAt?: string;

  // Added for UI compatibility
  value?: string | number;
  ageGroup?: string;
  kidneyFunctionStage?: string;
}

export interface AlertCreateDTO {
  patientId: string;
  type: string;
  message: string;
  severity: string;
}

export interface AlertUpdateDTO {
  type?: string;
  message?: string;
  severity?: string;
}
