import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WizardStateService } from './wizard-state.service';

@Component({
  selector: 'app-step4',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="step-container">
      <h2 class="step-title">Review & Deploy Configuration</h2>
      <p class="step-description">
        Review the complete VIP configuration before deploying to F5 BIG-IP.
      </p>

      @if (deployStatus() === 'success') {
        <div class="success-banner">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z"/>
          </svg>
          <div>
            <strong>Deployment Successful</strong>
            <div>All {{ wizardState.vipConfigurations().length }} VIPs have been configured on F5 BIG-IP.</div>
          </div>
        </div>
      }

      @if (dryRunResult()) {
        <div class="info-banner">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM6.5 7.75A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75zM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
          </svg>
          <div>
            <strong>Dry Run Complete</strong>
            <div>{{ dryRunResult() }}</div>
          </div>
        </div>
      }

      <div class="summary-grid">
        @for (config of wizardState.vipConfigurations(); track config.id) {
          <div class="summary-card">
            <div class="summary-header">
              <h3 class="vip-name">{{ config.name }}</h3>
              <span class="protocol-badge">{{ config.protocol }}</span>
            </div>

            <div class="summary-details">
              <div class="detail-row">
                <span class="detail-label">Virtual IP</span>
                <span class="detail-value">{{ config.virtualIP }}:{{ config.port }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">SSL Profile</span>
                <span class="detail-value">{{ config.sslProfile }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Default Pool</span>
                <span class="detail-value">{{ config.defaultPool }}</span>
              </div>
              @if (config.iRule) {
                <div class="detail-row">
                  <span class="detail-label">iRule</span>
                  <span class="detail-value">{{ config.iRule }}</span>
                </div>
              }
            </div>

            <div class="hosts-section">
              <div class="hosts-label">Backend Hosts ({{ config.hosts.length }})</div>
              <div class="hosts-list">
                @for (host of config.hosts; track host.host) {
                  <div class="host-item">
                    <span class="host-name">{{ host.host }}</span>
                    <span class="auth-badge" [attr.data-auth]="host.auth">{{ host.auth }}</span>
                  </div>
                }
              </div>
            </div>
          </div>
        }
      </div>

      <div class="action-row">
        <button
          class="btn btn-secondary"
          (click)="runDryRun()"
          [disabled]="isProcessing()">
          @if (isProcessing() && currentAction() === 'dryrun') {
            <span class="spinner"></span>
          }
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M1.5 8a6.5 6.5 0 0 1 13 0 .75.75 0 0 0 1.5 0 8 8 0 1 0-8 8 .75.75 0 0 0 0-1.5A6.5 6.5 0 0 1 1.5 8zM8 3a.75.75 0 0 1 .75.75v3.5h3.5a.75.75 0 0 1 0 1.5h-4.25a.75.75 0 0 1-.75-.75v-4.25A.75.75 0 0 1 8 3z"/>
          </svg>
          Dry Run Validation
        </button>

        <button
          class="btn btn-primary"
          (click)="deploy()"
          [disabled]="isProcessing()">
          @if (isProcessing() && currentAction() === 'deploy') {
            <span class="spinner"></span>
          }
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M1.75 1h12.5c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0 1 14.25 15H1.75A1.75 1.75 0 0 1 0 13.25V2.75C0 1.784.784 1 1.75 1ZM1.5 2.75v10.5c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25V2.75a.25.25 0 0 0-.25-.25H1.75a.25.25 0 0 0-.25.25Zm6.75 3a.75.75 0 0 1 .75.75v2.19l.72-.72a.75.75 0 1 1 1.06 1.06l-2 2a.75.75 0 0 1-1.06 0l-2-2a.75.75 0 0 1 1.06-1.06l.72.72V6.5a.75.75 0 0 1 .75-.75Z"/>
          </svg>
          Deploy to F5 BIG-IP
        </button>
      </div>

      <div class="step-actions">
        <button class="btn btn-secondary" (click)="wizardState.previousStep()">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M7.78 12.53a.75.75 0 0 1-1.06 0L2.47 8.28a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 1.06L4.81 7h7.44a.75.75 0 0 1 0 1.5H4.81l2.97 2.97a.75.75 0 0 1 0 1.06z"/>
          </svg>
          Back to Configuration
        </button>
        <button class="btn btn-ghost" (click)="startOver()">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M1.5 3.25a.75.75 0 0 1 1.5 0v2.122l.513-.513a6.5 6.5 0 0 1 9.644 8.77.75.75 0 0 1-1.214-.882 5 5 0 1 0-7.78-1.128l.513-.513A.75.75 0 1 1 5.736 12.3l-1.75 1.75a.75.75 0 0 1-1.06 0l-1.75-1.75a.75.75 0 0 1 1.06-1.06l.513.513V3.25z"/>
          </svg>
          Start Over
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
    }

    .success-banner,
    .info-banner {
      display: flex;
      gap: 1rem;
      padding: 1rem 1.25rem;
      border-radius: 6px;
      margin-bottom: 2rem;
    }

    .success-banner {
      background: rgba(46, 160, 67, 0.1);
      border: 1px solid rgba(46, 160, 67, 0.4);
      color: #56d4a0;
    }

    .info-banner {
      background: rgba(56, 139, 253, 0.1);
      border: 1px solid rgba(56, 139, 253, 0.4);
      color: #79c0ff;
    }

    .success-banner svg,
    .info-banner svg {
      flex-shrink: 0;
      margin-top: 0.125rem;
    }

    .success-banner strong,
    .info-banner strong {
      display: block;
      margin-bottom: 0.25rem;
    }

    .success-banner > div > div,
    .info-banner > div > div {
      font-size: 0.875rem;
      opacity: 0.9;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .summary-card {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 6px;
      padding: 1.5rem;
    }

    .summary-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.25rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #21262d;
    }

    .vip-name {
      font-size: 1.125rem;
      font-weight: 600;
      color: #e6edf3;
      margin: 0;
      font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
    }

    .protocol-badge {
      padding: 0.25rem 0.625rem;
      background: rgba(31, 111, 235, 0.2);
      color: #79c0ff;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .summary-details {
      margin-bottom: 1.25rem;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 0.625rem 0;
      border-bottom: 1px solid #21262d;
    }

    .detail-row:last-child {
      border-bottom: none;
    }

    .detail-label {
      font-size: 0.875rem;
      color: #7d8590;
      font-weight: 500;
    }

    .detail-value {
      font-size: 0.875rem;
      color: #e6edf3;
      font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
    }

    .hosts-section {
      background: #0d1117;
      border: 1px solid #21262d;
      border-radius: 6px;
      padding: 1rem;
    }

    .hosts-label {
      font-size: 0.8125rem;
      font-weight: 600;
      color: #7d8590;
      margin-bottom: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .hosts-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .host-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem 0.75rem;
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 4px;
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

    .action-row {
      display: flex;
      gap: 1rem;
      justify-content: center;
      margin-bottom: 2rem;
      padding: 1.5rem;
      background: #0d1117;
      border: 1px solid #21262d;
      border-radius: 6px;
    }

    .step-actions {
      display: flex;
      justify-content: space-between;
      padding-top: 1.5rem;
      border-top: 1px solid #21262d;
    }

    .btn {
      padding: 0.75rem 1.5rem;
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
      background: #238636;
      color: #ffffff;
    }

    .btn-primary:hover:not(:disabled) {
      background: #2ea043;
    }

    .btn-primary:disabled {
      background: #21262d;
      color: #484f58;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: #21262d;
      color: #c9d1d9;
      border: 1px solid #30363d;
    }

    .btn-secondary:hover:not(:disabled) {
      background: #30363d;
    }

    .btn-secondary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-ghost {
      background: transparent;
      color: #7d8590;
    }

    .btn-ghost:hover {
      color: #c9d1d9;
      background: #21262d;
    }

    .spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class Step4Component {
  wizardState = inject(WizardStateService);
  isProcessing = signal(false);
  currentAction = signal<'dryrun' | 'deploy' | null>(null);
  dryRunResult = signal<string | null>(null);
  deployStatus = signal<'idle' | 'success' | 'error'>('idle');

  async runDryRun() {
    this.isProcessing.set(true);
    this.currentAction.set('dryrun');
    this.dryRunResult.set(null);

    await new Promise(resolve => setTimeout(resolve, 1500));

    this.dryRunResult.set('All configurations validated successfully. Ready for deployment.');
    this.isProcessing.set(false);
    this.currentAction.set(null);
  }

  async deploy() {
    this.isProcessing.set(true);
    this.currentAction.set('deploy');
    this.deployStatus.set('idle');

    await new Promise(resolve => setTimeout(resolve, 2000));

    this.deployStatus.set('success');
    this.isProcessing.set(false);
    this.currentAction.set(null);
  }

  startOver() {
    if (confirm('Are you sure you want to start over? All current configuration will be lost.')) {
      this.wizardState.reset();
    }
  }
}
