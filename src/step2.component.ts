import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { WizardStateService } from './wizard-state.service';
import { ExternalHost } from './models';

@Component({
  selector: 'app-step2',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  template: `
    <div class="step-container">
      <h2 class="step-title">Assign Hosts to VIPs</h2>
      <p class="step-description">
        Group external hosts into Virtual IP addresses. Each VIP will become a load-balanced entry point.
        <br>Default: one host per VIP (safest). Drag hosts between VIPs to consolidate.
      </p>

      @if (hasAuthConflicts()) {
        <div class="warning-banner">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575L6.457 1.047zM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-.25-5.25a.75.75 0 0 0-1.5 0v2.5a.75.75 0 0 0 1.5 0v-2.5z"/>
          </svg>
          <div class="warning-content">
            <strong>Authentication Method Conflicts Detected</strong>
            <div class="conflict-list">
              @for (conflict of authConflicts(); track conflict.vipId) {
                <div>VIP "{{ conflict.vipName }}" mixes auth methods: {{ conflict.methods.join(', ') }} — verify F5 policy profiles are compatible.</div>
              }
            </div>
          </div>
        </div>
      }

      <div class="vip-grid">
        @for (vip of wizardState.vipAssignments(); track vip.id) {
          <div class="vip-card" [class.has-conflict]="vipHasAuthConflict(vip.id)">
            <div class="vip-header">
              <input
                type="text"
                class="vip-name-input"
                [(ngModel)]="vip.name"
                (blur)="updateVIPName(vip.id, vip.name)"
                placeholder="VIP name">
              <button class="btn-icon" (click)="removeVIP(vip.id)" title="Delete VIP">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M11 1.75V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75zM4.496 6.675l.66 6.6a.25.25 0 0 0 .249.225h5.19a.25.25 0 0 0 .249-.225l.66-6.6a.75.75 0 0 1 1.492.149l-.66 6.6A1.748 1.748 0 0 1 10.595 15h-5.19a1.748 1.748 0 0 1-1.741-1.575l-.66-6.6a.75.75 0 1 1 1.492-.15z"/>
                </svg>
              </button>
            </div>
            <div
              class="vip-drop-zone"
              cdkDropList
              [id]="vip.id"
              [cdkDropListData]="vip.hosts"
              [cdkDropListConnectedTo]="allDropZoneIds()"
              (cdkDropListDropped)="drop($event)">
              @if (vip.hosts.length === 0) {
                <div class="empty-state">Drag hosts here</div>
              }
              @for (host of vip.hosts; track host.host) {
                <div class="host-chip" cdkDrag [cdkDragData]="host">
                  <span class="host-name">{{ host.host }}</span>
                  <span class="auth-badge" [attr.data-auth]="host.auth">{{ host.auth }}</span>
                  <button class="chip-remove" (click)="moveToExcluded(host)" title="Exclude host">×</button>
                </div>
              }
            </div>
          </div>
        }

        <button class="new-vip-card" (click)="addNewVIP()">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          <span>New VIP</span>
        </button>
      </div>

      <div class="unassigned-section">
        <h3 class="section-title">Unassigned Hosts</h3>
        <div
          class="unassigned-pool"
          cdkDropList
          id="unassigned"
          [cdkDropListData]="wizardState.unassignedHosts()"
          [cdkDropListConnectedTo]="allDropZoneIds()"
          (cdkDropListDropped)="drop($event)">
          @if (wizardState.unassignedHosts().length === 0) {
            <div class="empty-state">All hosts assigned</div>
          }
          @for (host of wizardState.unassignedHosts(); track host.host) {
            <div class="host-chip" cdkDrag [cdkDragData]="host">
              <span class="host-name">{{ host.host }}</span>
              <span class="auth-badge" [attr.data-auth]="host.auth">{{ host.auth }}</span>
              <button class="chip-remove" (click)="moveToExcluded(host)" title="Exclude host">×</button>
            </div>
          }
        </div>
      </div>

      <details class="excluded-section">
        <summary class="section-title">Excluded Hosts ({{ wizardState.excludedHosts().length }})</summary>
        <div
          class="excluded-pool"
          cdkDropList
          id="excluded"
          [cdkDropListData]="wizardState.excludedHosts()"
          [cdkDropListConnectedTo]="['unassigned']"
          (cdkDropListDropped)="dropExcluded($event)">
          @if (wizardState.excludedHosts().length === 0) {
            <div class="empty-state">No excluded hosts</div>
          }
          @for (host of wizardState.excludedHosts(); track host.host) {
            <div class="host-chip excluded" cdkDrag [cdkDragData]="host">
              <span class="host-name">{{ host.host }}</span>
              <span class="auth-badge" [attr.data-auth]="host.auth">{{ host.auth }}</span>
              <button class="chip-restore" (click)="restoreFromExcluded(host)" title="Restore host">↺</button>
            </div>
          }
        </div>
      </details>

      <div class="step-actions">
        <button class="btn btn-secondary" (click)="wizardState.previousStep()">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M7.78 12.53a.75.75 0 0 1-1.06 0L2.47 8.28a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 1.06L4.81 7h7.44a.75.75 0 0 1 0 1.5H4.81l2.97 2.97a.75.75 0 0 1 0 1.06z"/>
          </svg>
          Back
        </button>
        <button
          class="btn btn-primary"
          [disabled]="!canProceed()"
          (click)="proceed()">
          Continue to Configuration
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8.22 2.97a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06l2.97-2.97H3.75a.75.75 0 0 1 0-1.5h7.44L8.22 4.03a.75.75 0 0 1 0-1.06z"/>
          </svg>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .step-container {
      max-width: 1400px;
      margin: 0 auto;
    }

    .step-title {
      font-size: 1.5rem;
      font-weight: 600;
      color: #e6edf3;
      margin: 0 0 0.5rem 0;
    }

    .step-description {
      color: #7d8590;
      margin: 0 0 2rem 0;
      font-size: 0.9375rem;
      line-height: 1.6;
    }

    .warning-banner {
      display: flex;
      gap: 1rem;
      padding: 1rem 1.25rem;
      background: rgba(187, 128, 9, 0.1);
      border: 1px solid rgba(187, 128, 9, 0.4);
      border-radius: 6px;
      margin-bottom: 2rem;
      color: #f2cc60;
    }

    .warning-banner svg {
      flex-shrink: 0;
      margin-top: 0.125rem;
    }

    .warning-content strong {
      display: block;
      margin-bottom: 0.5rem;
    }

    .conflict-list {
      font-size: 0.875rem;
      opacity: 0.9;
    }

    .conflict-list > div {
      margin-top: 0.25rem;
    }

    .vip-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .vip-card {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 6px;
      padding: 1rem;
      transition: border-color 0.2s ease;
    }

    .vip-card.has-conflict {
      border-color: rgba(187, 128, 9, 0.5);
    }

    .vip-header {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }

    .vip-name-input {
      flex: 1;
      padding: 0.5rem 0.75rem;
      background: #0d1117;
      border: 1px solid #30363d;
      border-radius: 6px;
      color: #e6edf3;
      font-size: 0.875rem;
      font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
      font-weight: 500;
    }

    .vip-name-input:focus {
      outline: none;
      border-color: #1f6feb;
    }

    .btn-icon {
      padding: 0.5rem;
      background: transparent;
      border: 1px solid #30363d;
      border-radius: 6px;
      color: #7d8590;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }

    .btn-icon:hover {
      background: #21262d;
      border-color: #f85149;
      color: #f85149;
    }

    .vip-drop-zone {
      min-height: 120px;
      background: #0d1117;
      border: 2px dashed #30363d;
      border-radius: 6px;
      padding: 0.75rem;
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-content: flex-start;
    }

    .cdk-drop-list-dragging .vip-drop-zone {
      background: rgba(31, 111, 235, 0.05);
      border-color: #1f6feb;
    }

    .empty-state {
      width: 100%;
      text-align: center;
      color: #484f58;
      font-size: 0.875rem;
      padding: 2rem 0;
    }

    .host-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      background: #21262d;
      border: 1px solid #30363d;
      border-radius: 6px;
      cursor: move;
      transition: all 0.15s ease;
    }

    .host-chip:hover {
      background: #2d333b;
      border-color: #484f58;
    }

    .host-chip.cdk-drag-preview {
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
      opacity: 0.9;
    }

    .host-chip.cdk-drag-animating {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }

    .host-chip.excluded {
      opacity: 0.5;
      background: #161b22;
    }

    .host-chip.excluded .host-name {
      text-decoration: line-through;
    }

    .host-name {
      font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
      font-size: 0.8125rem;
      color: #e6edf3;
    }

    .auth-badge {
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      padding: 0.125rem 0.375rem;
      border-radius: 3px;
      letter-spacing: 0.025em;
    }

    .auth-badge[data-auth="psso"] {
      background: rgba(163, 113, 247, 0.2);
      color: #d2a8ff;
    }

    .auth-badge[data-auth="kerberos"] {
      background: rgba(79, 172, 254, 0.2);
      color: #79c0ff;
    }

    .auth-badge[data-auth="none"] {
      background: rgba(125, 133, 144, 0.2);
      color: #8b949e;
    }

    .auth-badge[data-auth="basic"] {
      background: rgba(187, 128, 9, 0.2);
      color: #f2cc60;
    }

    .auth-badge[data-auth="oauth2"] {
      background: rgba(56, 211, 159, 0.2);
      color: #56d4a0;
    }

    .auth-badge[data-auth="apikey"] {
      background: rgba(255, 125, 133, 0.2);
      color: #ff7b72;
    }

    .chip-remove,
    .chip-restore {
      background: transparent;
      border: none;
      color: #7d8590;
      cursor: pointer;
      padding: 0 0.25rem;
      margin-left: 0.25rem;
      font-size: 1.125rem;
      line-height: 1;
      transition: color 0.15s ease;
    }

    .chip-remove:hover {
      color: #f85149;
    }

    .chip-restore:hover {
      color: #56d4a0;
    }

    .new-vip-card {
      background: transparent;
      border: 2px dashed #30363d;
      border-radius: 6px;
      padding: 2rem;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      color: #7d8590;
      transition: all 0.2s ease;
      min-height: 180px;
    }

    .new-vip-card:hover {
      border-color: #1f6feb;
      color: #1f6feb;
      background: rgba(31, 111, 235, 0.05);
    }

    .new-vip-card span {
      font-weight: 500;
      font-size: 0.9375rem;
    }

    .unassigned-section,
    .excluded-section {
      margin-bottom: 2rem;
    }

    .section-title {
      font-size: 1rem;
      font-weight: 600;
      color: #e6edf3;
      margin-bottom: 0.75rem;
      cursor: pointer;
      user-select: none;
    }

    details .section-title {
      list-style: none;
    }

    details .section-title::before {
      content: '▸ ';
      display: inline-block;
      transition: transform 0.2s ease;
    }

    details[open] .section-title::before {
      transform: rotate(90deg);
    }

    .unassigned-pool,
    .excluded-pool {
      min-height: 80px;
      background: #0d1117;
      border: 1px solid #30363d;
      border-radius: 6px;
      padding: 0.75rem;
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-content: flex-start;
    }

    .excluded-pool {
      background: #161b22;
      border-style: dashed;
    }

    .step-actions {
      display: flex;
      justify-content: space-between;
      padding-top: 1.5rem;
      border-top: 1px solid #21262d;
    }

    .btn {
      padding: 0.625rem 1.25rem;
      border-radius: 6px;
      font-size: 0.875rem;
      font-weight: 500;
      border: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.15s ease;
    }

    .btn-primary {
      background: #1f6feb;
      color: #ffffff;
    }

    .btn-primary:hover:not(:disabled) {
      background: #1a63d7;
    }

    .btn-primary:disabled {
      background: #21262d;
      color: #484f58;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: #21262d;
      color: #c9d1d9;
    }

    .btn-secondary:hover {
      background: #30363d;
    }
  `]
})
export class Step2Component {
  wizardState = inject(WizardStateService);

  allDropZoneIds = computed(() => {
    const vipIds = this.wizardState.vipAssignments().map(v => v.id);
    return [...vipIds, 'unassigned'];
  });

  authConflicts = computed(() => {
    return this.wizardState.vipAssignments()
      .map(vip => {
        const authMethods = [...new Set(vip.hosts.map(h => h.auth))];
        return {
          vipId: vip.id,
          vipName: vip.name,
          methods: authMethods,
          hasConflict: authMethods.length > 1
        };
      })
      .filter(c => c.hasConflict);
  });

  hasAuthConflicts = computed(() => this.authConflicts().length > 0);

  vipHasAuthConflict(vipId: string): boolean {
    return this.authConflicts().some(c => c.vipId === vipId);
  }

  canProceed = computed(() => this.wizardState.unassignedHosts().length === 0);

  drop(event: CdkDragDrop<ExternalHost[]>) {
    const host = event.item.data as ExternalHost;

    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      if (event.container.id === 'unassigned') {
        this.wizardState.moveHostToUnassigned(host);
      } else {
        this.wizardState.moveHostToVIP(host, event.container.id);
      }
    }
  }

  dropExcluded(event: CdkDragDrop<ExternalHost[]>) {
    const host = event.item.data as ExternalHost;
    if (event.previousContainer.id === 'excluded' && event.container.id === 'unassigned') {
      this.restoreFromExcluded(host);
    }
  }

  addNewVIP() {
    this.wizardState.addVIP();
  }

  removeVIP(vipId: string) {
    this.wizardState.removeVIP(vipId);
  }

  updateVIPName(vipId: string, newName: string) {
    this.wizardState.updateVIPName(vipId, newName);
  }

  moveToExcluded(host: ExternalHost) {
    this.wizardState.moveHostToExcluded(host);
  }

  restoreFromExcluded(host: ExternalHost) {
    this.wizardState.moveHostToUnassigned(host);
  }

  proceed() {
    if (this.canProceed()) {
      this.wizardState.prepareConfigurations();
      this.wizardState.nextStep();
    }
  }
}
