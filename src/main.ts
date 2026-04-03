import { Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { WizardContainerComponent } from './wizard-container.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [WizardContainerComponent],
  template: `
    <app-wizard-container></app-wizard-container>
  `,
})
export class App {}

bootstrapApplication(App);
