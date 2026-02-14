import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

interface Chamber {
  id: string;
  name: string;
  slug: string;
}

interface CMMember {
  id: string;
  business_name: string;
  email?: string;
  phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip?: string;
}

interface ApiResponse<T> {
  data: T | null;
  error: { code: string; message: string } | null;
}

@Injectable({
  providedIn: 'root'
})
export class ChamberService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/chambers`;

  getChambers(): Observable<ApiResponse<Chamber[]>> {
    return this.http.get<ApiResponse<Chamber[]>>(this.baseUrl);
  }

  getChamber(id: string): Observable<ApiResponse<Chamber>> {
    return this.http.get<ApiResponse<Chamber>>(`${this.baseUrl}/${id}`);
  }

  searchMembers(chamberId: string, query: string): Observable<ApiResponse<CMMember[]>> {
    return this.http.get<ApiResponse<CMMember[]>>(`${this.baseUrl}/${chamberId}/members/search`, {
      params: { q: query }
    });
  }
}
