import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from './api.service';
import { WizardStateService } from './wizard-state.service';

@Component({
  selector: 'app-step1',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="step-container">
      <h2 class="step-title">Select Application</h2>
      <p class="step-description">Choose the on-premises application to configure VIPs for</p>

      @if (isLoading()) {
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Loading applications...</p>
        </div>
      } @else if (error()) {
        <div class="error-state">
          <p>⚠️ Error loading applications: {{ error() }}</p>
          <button class="btn btn-secondary" (click)="retryLoad()">Try Again</button>
        </div>
      } @else {
        <div class="app-grid">
          @for (app of applications(); track app) {
            <button
              class="app-card"
              [class.selected]="selectedApp() === app"
              (click)="selectApplication(app)">
              <div class="app-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                  <line x1="8" y1="21" x2="16" y2="21"/>
                  <line x1="12" y1="17" x2="12" y2="21"/>
                </svg>
              </div>
              <div class="app-info">
                <div class="app-name">{{ app }}</div>
                <div class="app-meta">{{ getHostCount(app) }} external hosts</div>
              </div>
            </button>
          }
        </div>

        <div class="step-actions">
          <button
            class="btn btn-primary"
            [disabled]="!selectedApp()"
            (click)="proceed()">
            Continue to VIP Assignment
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8.22 2.97a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06l2.97-2.97H3.75a.75.75 0 0 1 0-1.5h7.44L8.22 4.03a.75.75 0 0 1 0-1.06z"/>
            </svg>
          </button>
        </div>
      }
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

    .loading-state, .error-state {
      padding: 2rem;
      text-align: center;
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 6px;
      margin-bottom: 2rem;
    }

    .loading-state p, .error-state p {
      margin: 0.5rem 0 0 0;
      color: #7d8590;
    }

    .error-state {
      border-color: #da3633;
      background: rgba(218, 54, 51, 0.1);
    }

    .error-state p {
      color: #f85149;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #30363d;
      border-top-color: #1f6feb;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .app-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .app-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.25rem;
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
      text-align: left;
      width: 100%;
    }

    .app-card:hover {
      border-color: #1f6feb;
      background: #1c2128;
    }

    .app-card.selected {
      border-color: #1f6feb;
      background: #0d1117;
      box-shadow: 0 0 0 3px rgba(31, 111, 235, 0.15);
    }

    .app-icon {
      width: 48px;
      height: 48px;
      background: #21262d;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #7d8590;
      flex-shrink: 0;
    }

    .app-card.selected .app-icon {
      background: #1f6feb;
      color: #ffffff;
    }

    .app-info {
      flex: 1;
    }

    .app-name {
      font-size: 1rem;
      font-weight: 600;
      color: #e6edf3;
      margin-bottom: 0.25rem;
      font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
    }

    .app-meta {
      font-size: 0.8125rem;
      color: #7d8590;
    }

    .step-actions {
      display: flex;
      justify-content: flex-end;
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
      color: #7d8590;
    }

    .btn-secondary:hover {
      background: #30363d;
    }
  `]
})
export class Step1Component {
  private apiService = inject(ApiService);
  private wizardState = inject(WizardStateService);

  applications = signal<string[]>([]);
  selectedApp = signal<string | null>(null);
  isLoading = signal(false);
  error = signal<string | null>(null);
  private hostCounts = signal<Record<string, number>>({});

  constructor() {
    effect(() => {
      this.loadApplications();
    });
  }

  private loadApplications() {
    this.isLoading.set(true);
    this.error.set(null);

    this.apiService.getApplicationNames().subscribe({
      next: (names) => {
        this.applications.set(names);
        // Load host counts for all applications
        this.loadAllHostCounts(names);
      },
      error: (err) => {
        console.error('Error loading applications:', err);
        this.error.set(err.message || 'Failed to load applications');
        this.isLoading.set(false);
      }
    });
  }

  private loadAllHostCounts(appNames: string[]) {
    const counts: Record<string, number> = {};
    let loadedCount = 0;

    appNames.forEach(appName => {
      this.apiService.getHostsForApplication(appName).subscribe({
        next: (hosts) => {
          counts[appName] = hosts.length;
          loadedCount++;
          if (loadedCount === appNames.length) {
            this.hostCounts.set(counts);
            this.isLoading.set(false);
          }
        },
        error: (err) => {
          console.error(`Error loading hosts for ${appName}:`, err);
          counts[appName] = 0;
          loadedCount++;
          if (loadedCount === appNames.length) {
            this.hostCounts.set(counts);
            this.isLoading.set(false);
          }
        }
      });
    });
  }

  getHostCount(app: string): number {
    return this.hostCounts()[app] || 0;
  }

  selectApplication(app: string) {
    this.selectedApp.set(app);
  }

  proceed() {
    const app = this.selectedApp();
    if (app) {
      this.apiService.getHostsForApplication(app).subscribe({
        next: (hosts) => {
          this.wizardState.setSelectedApp(app, hosts);
          this.wizardState.nextStep();
        },
        error: (err) => {
          console.error('Error loading hosts:', err);
          this.error.set('Failed to load hosts for selected application');
        }
      });
    }
  }

  retryLoad() {
    this.loadApplications();
  }
}
