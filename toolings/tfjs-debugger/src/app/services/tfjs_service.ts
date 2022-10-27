import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Observable, shareReplay} from 'rxjs';

import {ModelJson} from '../data_model/run_results';

const TFHUB_SEARCH_PARAM = '?tfjs-format=file';
const DEFAULT_MODEL_NAME = 'model.json';

/** Service for TFJS related tasks.  */
@Injectable({
  providedIn: 'root',
})
export class TfjsService {
  private modelJsonCache: {[url: string]: Observable<ModelJson>} = {};

  constructor(private http: HttpClient) {}

  fetchModelJson(url: string): Observable<ModelJson> {
    if (url.startsWith('https://tfhub.dev')) {
      url = this.getTFHubUrl(url);
    }
    if (!this.modelJsonCache[url]) {
      // ShareReplay will return the last emitted value, i.e. the response from
      // the http request, without sending the request again.
      this.modelJsonCache[url] =
          this.http.get<ModelJson>(url).pipe(shareReplay(1));
    }
    return this.modelJsonCache[url];
  }

  private getTFHubUrl(modelUrl: string): string {
    if (!modelUrl.endsWith('/')) {
      modelUrl = (modelUrl) + '/';
    }
    return `${modelUrl}${DEFAULT_MODEL_NAME}${TFHUB_SEARCH_PARAM}`;
  }
}
