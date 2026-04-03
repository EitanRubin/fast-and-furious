import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WizardStateService } from './wizard-state.service';

@Component({
  selector: 'app-step3',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="step-container">
      <h2 class="step-title">Configure VIP Details</h2>
      <p class="step-description">
        Provide F5 BIG-IP configuration parameters for each Virtual IP address.
      </p>

      <div class="config-sections">
        @for (config of wizardState.vipConfigurations(); track config.id; let i = $index) {
          <div class="config-section">
            <div class="section-header">
              <h3 class="section-title">{{ config.name }}</h3>
              <div class="host-summary">
                {{ config.hosts.length }} host{{ config.hosts.length !== 1 ? 's' : '' }}:
                @for (host of config.hosts; track host.host) {
                  <span class="host-tag">{{ host.host }}</span>
                }
              </div>
            </div>

            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">
                  Virtual IP Address *
                  <span class="label-hint">IPv4 address</span>
                </label>
                <input
                  type="text"
                  class="form-input"
                  [(ngModel)]="config.virtualIP"
                  placeholder="10.0.0.100"
                  pattern="^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$"
                  required>
              </div>

              <div class="form-group">
                <label class="form-label">
                  Port *
                  <span class="label-hint">1-65535</span>
                </label>
                <input
                  type="number"
                  class="form-input"
                  [(ngModel)]="config.port"
                  min="1"
                  max="65535"
                  required>
              </div>

              <div class="form-group">
                <label class="form-label">
                  Protocol *
                </label>
                <select
                  class="form-select"
                  [(ngModel)]="config.protocol"
                  required>
                  <option value="HTTPS">HTTPS</option>
                  <option value="HTTP">HTTP</option>
                  <option value="TCP">TCP</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">
                  SSL Profile *
                  <span class="label-hint">F5 SSL profile name</span>
                </label>
                <input
                  type="text"
                  class="form-input"
                  [(ngModel)]="config.sslProfile"
                  placeholder="clientssl"
                  required>
              </div>

              <div class="form-group">
                <label class="form-label">
                  Default Pool *
                  <span class="label-hint">F5 pool name</span>
                </label>
                <input
                  type="text"
                  class="form-input"
                  [(ngModel)]="config.defaultPool"
                  placeholder="pool_{{ config.name }}"
                  required>
              </div>

              <div class="form-group">
                <label class="form-label">
                  iRule
                  <span class="label-hint">Optional</span>
                </label>
                <input
                  type="text"
                  class="form-input"
                  [(ngModel)]="config.iRule"
                  placeholder="irule_custom_routing">
              </div>
            </div>
          </div>
        }
      </div>

      <div class="step-actions">
        <button class="btn btn-secondary" (click)="wizardState.previousStep()">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M7.78 12.53a.75.75 0 0 1-1.06 0L2.47 8.28a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 1.06L4.81 7h7.44a.75.75 0 0 1 0 1.5H4.81l2.97 2.97a.75.75 0 0 1 0 1.06z"/>
          </svg>
          Back
        </button>
        <button
          class="btn btn-primary"
          [disabled]="!isFormValid()"
          (click)="proceed()">
          Continue to Review
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8.22 2.97a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06l2.97-2.97H3.75a.75.75 0 0 1 0-1.5h7.44L8.22 4.03a.75.75 0 0 1 0-1.06z"/>
          </svg>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .step-container {
      max-width: 1200px;
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
    }

    .config-sections {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .config-section {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 6px;
      padding: 1.5rem;
    }

    .section-header {
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #21262d;
    }

    .section-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: #e6edf3;
      margin: 0 0 0.75rem 0;
      font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
    }

    .host-summary {
      font-size: 0.875rem;
      color: #7d8590;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .host-tag {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      background: #21262d;
      border: 1px solid #30363d;
      border-radius: 3px;
      font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
      font-size: 0.75rem;
      color: #c9d1d9;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.25rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
    }

    .form-label {
      font-size: 0.875rem;
      font-weight: 600;
      color: #e6edf3;
      margin-bottom: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .label-hint {
      font-size: 0.75rem;
      font-weight: 400;
      color: #7d8590;
    }

    .form-input,
    .form-select {
      padding: 0.625rem 0.75rem;
      background: #0d1117;
      border: 1px solid #30363d;
      border-radius: 6px;
      color: #e6edf3;
      font-size: 0.875rem;
      font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
      transition: border-color 0.15s ease;
    }

    .form-input:focus,
    .form-select:focus {
      outline: none;
      border-color: #1f6feb;
    }

    .form-input::placeholder {
      color: #484f58;
    }

    .form-input:invalid:not(:placeholder-shown) {
      border-color: #f85149;
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
export class Step3Component {
  wizardState = inject(WizardStateService);

  isFormValid(): boolean {
    const configs = this.wizardState.vipConfigurations();
    return configs.every(config =>
      config.virtualIP &&
      config.port >= 1 && config.port <= 65535 &&
      config.protocol &&
      config.sslProfile &&
      config.defaultPool
    );
  }

  proceed() {
    if (this.isFormValid()) {
      this.wizardState.nextStep();
    }
  }
}
