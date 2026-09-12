export const MONITORING_PORT = Symbol('MONITORING_PORT');

export interface MonitoringPort {
  captureError(error: unknown, context: Record<string, string>): void;
  recordEvent(name: string, context: Record<string, string>): void;
}
