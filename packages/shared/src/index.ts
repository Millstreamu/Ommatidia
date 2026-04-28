export const projectName = 'Engineering Design Assistant';

export interface HealthStatus {
  service: string;
  status: 'ok' | 'warning' | 'error';
}
