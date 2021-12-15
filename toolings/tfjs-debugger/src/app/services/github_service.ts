import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';

import {ReleaseJson} from '../data_model/tfjs_release';

const GITHUB_RELEASES_API_ENDPOINT =
    'https://api.github.com/repos/tensorflow/tfjs/releases';

/** Service to interact with github APIs.  */
@Injectable({
  providedIn: 'root',
})
export class GithubService {
  constructor(private http: HttpClient) {}

  fetchTfjsReleases(): Observable<ReleaseJson[]> {
    return this.http.get<ReleaseJson[]>(GITHUB_RELEASES_API_ENDPOINT);
  }
}
