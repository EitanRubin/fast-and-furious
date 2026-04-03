export interface ExternalHost {
  host: string;
  auth: string;
}

export interface ApplicationData {
  [appName: string]: ExternalHost[];
}

export interface VIPAssignment {
  id: string;
  name: string;
  hosts: ExternalHost[];
}

export interface VIPConfiguration {
  id: string;
  name: string;
  hosts: ExternalHost[];
  virtualIP: string;
  port: number;
  protocol: 'HTTPS' | 'HTTP' | 'TCP';
  sslProfile: string;
  defaultPool: string;
  iRule: string;
}

export interface WizardState {
  currentStep: number;
  selectedApp: string | null;
  vipAssignments: VIPAssignment[];
  unassignedHosts: ExternalHost[];
  excludedHosts: ExternalHost[];
  vipConfigurations: VIPConfiguration[];
}
