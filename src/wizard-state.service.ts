import { Injectable, signal } from '@angular/core';
import { ExternalHost, VIPAssignment, VIPConfiguration } from './models';

@Injectable({
  providedIn: 'root'
})
export class WizardStateService {
  currentStep = signal(1);
  selectedApp = signal<string | null>(null);
  vipAssignments = signal<VIPAssignment[]>([]);
  unassignedHosts = signal<ExternalHost[]>([]);
  excludedHosts = signal<ExternalHost[]>([]);
  vipConfigurations = signal<VIPConfiguration[]>([]);

  setSelectedApp(appName: string, hosts: ExternalHost[]) {
    this.selectedApp.set(appName);
    const initialVIPs = hosts.map((host, index) => ({
      id: `vip-${index + 1}`,
      name: `${appName}-vip-${index + 1}`,
      hosts: [host]
    }));
    this.vipAssignments.set(initialVIPs);
    this.unassignedHosts.set([]);
    this.excludedHosts.set([]);
  }

  nextStep() {
    if (this.currentStep() < 4) {
      this.currentStep.update(s => s + 1);
    }
  }

  previousStep() {
    if (this.currentStep() > 1) {
      this.currentStep.update(s => s - 1);
    }
  }

  goToStep(step: number) {
    if (step >= 1 && step <= 4) {
      this.currentStep.set(step);
    }
  }

  addVIP() {
    const currentVIPs = this.vipAssignments();
    const newId = `vip-${currentVIPs.length + 1}`;
    const newVIP: VIPAssignment = {
      id: newId,
      name: `${this.selectedApp()}-vip-${currentVIPs.length + 1}`,
      hosts: []
    };
    this.vipAssignments.update(vips => [...vips, newVIP]);
  }

  removeVIP(vipId: string) {
    const vip = this.vipAssignments().find(v => v.id === vipId);
    if (vip) {
      this.unassignedHosts.update(hosts => [...hosts, ...vip.hosts]);
      this.vipAssignments.update(vips => vips.filter(v => v.id !== vipId));
    }
  }

  updateVIPName(vipId: string, newName: string) {
    this.vipAssignments.update(vips =>
      vips.map(vip => vip.id === vipId ? { ...vip, name: newName } : vip)
    );
  }

  moveHostToVIP(host: ExternalHost, targetVIPId: string) {
    const currentVIPs = this.vipAssignments();

    this.vipAssignments.update(vips =>
      vips.map(vip => ({
        ...vip,
        hosts: vip.id === targetVIPId
          ? [...vip.hosts, host]
          : vip.hosts.filter(h => h.host !== host.host)
      }))
    );

    this.unassignedHosts.update(hosts =>
      hosts.filter(h => h.host !== host.host)
    );
  }

  moveHostToUnassigned(host: ExternalHost) {
    this.vipAssignments.update(vips =>
      vips.map(vip => ({
        ...vip,
        hosts: vip.hosts.filter(h => h.host !== host.host)
      }))
    );

    this.excludedHosts.update(hosts =>
      hosts.filter(h => h.host !== host.host)
    );

    const isAlreadyUnassigned = this.unassignedHosts().some(h => h.host === host.host);
    if (!isAlreadyUnassigned) {
      this.unassignedHosts.update(hosts => [...hosts, host]);
    }
  }

  moveHostToExcluded(host: ExternalHost) {
    this.vipAssignments.update(vips =>
      vips.map(vip => ({
        ...vip,
        hosts: vip.hosts.filter(h => h.host !== host.host)
      }))
    );

    this.unassignedHosts.update(hosts =>
      hosts.filter(h => h.host !== host.host)
    );

    const isAlreadyExcluded = this.excludedHosts().some(h => h.host === host.host);
    if (!isAlreadyExcluded) {
      this.excludedHosts.update(hosts => [...hosts, host]);
    }
  }

  prepareConfigurations() {
    const configs: VIPConfiguration[] = this.vipAssignments().map(vip => ({
      id: vip.id,
      name: vip.name,
      hosts: vip.hosts,
      virtualIP: '',
      port: 443,
      protocol: 'HTTPS' as const,
      sslProfile: '',
      defaultPool: '',
      iRule: ''
    }));
    this.vipConfigurations.set(configs);
  }

  updateVIPConfiguration(vipId: string, updates: Partial<VIPConfiguration>) {
    this.vipConfigurations.update(configs =>
      configs.map(config =>
        config.id === vipId ? { ...config, ...updates } : config
      )
    );
  }

  reset() {
    this.currentStep.set(1);
    this.selectedApp.set(null);
    this.vipAssignments.set([]);
    this.unassignedHosts.set([]);
    this.excludedHosts.set([]);
    this.vipConfigurations.set([]);
  }
}
