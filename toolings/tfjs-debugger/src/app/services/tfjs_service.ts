import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Observable, shareReplay} from 'rxjs';

import {ModelJson} from '../data_model/run_results';

/** Service for TFJS related tasks.  */
@Injectable({
  providedIn: 'root',
})
export class TfjsService {
  private modelJsonCache: {[url: string]: Observable<ModelJson>} = {};

  constructor(private http: HttpClient) {}

  fetchModelJson(url: string): Observable<ModelJson> {
    if (!this.modelJsonCache[url]) {
      // ShareReplay will return the last emitted value, i.e. the response from
      // the http request, without sending the request again.
      this.modelJsonCache[url] =
          this.http.get<ModelJson>(url).pipe(shareReplay(1));
    }
    return this.modelJsonCache[url];
  }
}
