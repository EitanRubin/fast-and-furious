import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WizardStateService } from './wizard-state.service';
import { Step1Component } from './step1.component';
import { Step2Component } from './step2.component';
import { Step3Component } from './step3.component';
import { Step4Component } from './step4.component';

@Component({
  selector: 'app-wizard-container',
  standalone: true,
  imports: [CommonModule, Step1Component, Step2Component, Step3Component, Step4Component],
  template: `
    <div class="wizard-container">
      <header class="wizard-header">
        <h1>F5 BIG-IP VIP Configuration</h1>
        <p class="subtitle">Virtual IP Address Configuration Tool</p>
      </header>

      <div class="progress-bar">
        <div class="progress-step" [class.active]="wizardState.currentStep() >= 1" [class.current]="wizardState.currentStep() === 1">
          <div class="step-indicator">
            <span class="step-number">{{ wizardState.currentStep() > 1 ? '✓' : '1' }}</span>
          </div>
          <span class="step-label">Select Application</span>
        </div>
        <div class="progress-connector" [class.active]="wizardState.currentStep() >= 2"></div>
        <div class="progress-step" [class.active]="wizardState.currentStep() >= 2" [class.current]="wizardState.currentStep() === 2">
          <div class="step-indicator">
            <span class="step-number">{{ wizardState.currentStep() > 2 ? '✓' : '2' }}</span>
          </div>
          <span class="step-label">Assign VIPs</span>
        </div>
        <div class="progress-connector" [class.active]="wizardState.currentStep() >= 3"></div>
        <div class="progress-step" [class.active]="wizardState.currentStep() >= 3" [class.current]="wizardState.currentStep() === 3">
          <div class="step-indicator">
            <span class="step-number">{{ wizardState.currentStep() > 3 ? '✓' : '3' }}</span>
          </div>
          <span class="step-label">Configure VIPs</span>
        </div>
        <div class="progress-connector" [class.active]="wizardState.currentStep() >= 4"></div>
        <div class="progress-step" [class.active]="wizardState.currentStep() >= 4" [class.current]="wizardState.currentStep() === 4">
          <div class="step-indicator">
            <span class="step-number">4</span>
          </div>
          <span class="step-label">Review & Deploy</span>
        </div>
      </div>

      <div class="wizard-content">
        @if (wizardState.currentStep() === 1) {
          <app-step1></app-step1>
        } @else if (wizardState.currentStep() === 2) {
          <app-step2></app-step2>
        } @else if (wizardState.currentStep() === 3) {
          <app-step3></app-step3>
        } @else if (wizardState.currentStep() === 4) {
          <app-step4></app-step4>
        }
      </div>
    </div>
  `,
  styles: [`
    .wizard-container {
      min-height: 100vh;
      background: #0f1419;
      color: #c9d1d9;
    }

    .wizard-header {
      background: #161b22;
      border-bottom: 1px solid #30363d;
      padding: 2rem 3rem;
    }

    .wizard-header h1 {
      margin: 0 0 0.5rem 0;
      font-size: 1.75rem;
      font-weight: 600;
      color: #e6edf3;
      letter-spacing: -0.02em;
    }

    .subtitle {
      margin: 0;
      color: #7d8590;
      font-size: 0.875rem;
      font-weight: 400;
    }

    .progress-bar {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2.5rem 3rem;
      background: #0d1117;
      border-bottom: 1px solid #21262d;
    }

    .progress-step {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      position: relative;
    }

    .step-indicator {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #21262d;
      border: 2px solid #30363d;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }

    .progress-step.active .step-indicator {
      background: #1f6feb;
      border-color: #1f6feb;
    }

    .progress-step.current .step-indicator {
      background: #1f6feb;
      border-color: #1f6feb;
      box-shadow: 0 0 0 4px rgba(31, 111, 235, 0.15);
    }

    .step-number {
      font-size: 0.875rem;
      font-weight: 600;
      color: #7d8590;
    }

    .progress-step.active .step-number,
    .progress-step.current .step-number {
      color: #ffffff;
    }

    .step-label {
      font-size: 0.8125rem;
      font-weight: 500;
      color: #7d8590;
      white-space: nowrap;
    }

    .progress-step.active .step-label,
    .progress-step.current .step-label {
      color: #e6edf3;
    }

    .progress-connector {
      width: 80px;
      height: 2px;
      background: #30363d;
      margin: 0 1rem;
      margin-bottom: 2rem;
      transition: background 0.2s ease;
    }

    .progress-connector.active {
      background: #1f6feb;
    }

    .wizard-content {
      padding: 2rem 3rem 3rem;
    }
  `]
})
export class WizardContainerComponent {
  wizardState = inject(WizardStateService);
}
