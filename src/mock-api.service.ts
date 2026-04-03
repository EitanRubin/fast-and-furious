import { Injectable } from '@angular/core';
import { ApplicationData } from './models';

@Injectable({
  providedIn: 'root'
})
export class MockApiService {
  private mockData: ApplicationData = {
    'customer-portal': [
      { host: 'api.stripe.com', auth: 'psso' },
      { host: 'auth.okta.com', auth: 'psso' },
      { host: 'cdn.cloudflare.com', auth: 'none' },
      { host: 'analytics.google.com', auth: 'none' }
    ],
    'internal-hr-system': [
      { host: 'payroll.adp.com', auth: 'kerberos' },
      { host: 'benefits.company.internal', auth: 'kerberos' },
      { host: 'smtp.office365.com', auth: 'basic' },
      { host: 'ldap.company.internal', auth: 'kerberos' }
    ],
    'reporting-dashboard': [
      { host: 'warehouse.snowflake.com', auth: 'oauth2' },
      { host: 'api.tableau.com', auth: 'oauth2' },
      { host: 'smtp.sendgrid.com', auth: 'apikey' }
    ],
    'inventory-management': [
      { host: 'erp.sap.internal', auth: 'kerberos' },
      { host: 'api.ups.com', auth: 'apikey' },
      { host: 'api.fedex.com', auth: 'apikey' },
      { host: 'warehouse-scanner.company.internal', auth: 'basic' }
    ]
  };

  getApplications(): ApplicationData {
    return this.mockData;
  }

  getApplicationNames(): string[] {
    return Object.keys(this.mockData);
  }

  getHostsForApplication(appName: string): any[] {
    return this.mockData[appName] || [];
  }
}
