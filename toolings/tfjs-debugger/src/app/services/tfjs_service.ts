import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';

import {ModelJson} from '../data_model/run_results';

/** Service for TFJS related tasks.  */
@Injectable({
  providedIn: 'root',
})
export class TfjsService {
  constructor(private http: HttpClient) {}

  fetchModelJson(url: string): Observable<ModelJson> {
    return this.http.get<ModelJson>(url);
  }
}
