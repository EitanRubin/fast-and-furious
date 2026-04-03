import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApplicationData, ExternalHost } from './models';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = 'http://localhost:8000';

  constructor(private http: HttpClient) {}

  getApplications(): Observable<ApplicationData> {
    return this.http.get<ApplicationData>(`${this.baseUrl}/applications`);
  }

  getApplicationNames(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/applications/names`);
  }

  getHostsForApplication(appName: string): Observable<ExternalHost[]> {
    return this.http.get<ExternalHost[]>(`${this.baseUrl}/applications/${encodeURIComponent(appName)}/hosts`);
  }
}
