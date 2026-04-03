import { Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { WizardContainerComponent } from './wizard-container.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [HttpClientModule, WizardContainerComponent],
  template: `
    <app-wizard-container></app-wizard-container>
  `,
})
export class App {}

bootstrapApplication(App);
