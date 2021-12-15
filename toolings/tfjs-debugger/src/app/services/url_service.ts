/**
 * @license
 * Copyright 2021 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

import {Injectable} from '@angular/core';
import {Params, Router} from '@angular/router';

/**
 * Service for url related tasks.
 */
@Injectable({
  providedIn: 'root',
})
export class UrlService {
  constructor(
      private readonly router: Router,
  ) {}

  async updateUrlParameters(params: Params) {
    // Wrap router.navigate inside a setTimeout to make sure navigation happens
    // with update-to-date parameters.
    //
    // If router.navigate is called rapidly in succession within a tick without
    // using setTimeout, the second call will not have the updated query
    // parameters set from the first call.
    setTimeout(() => {
      return this.router.navigate([], {
        queryParams: {
          ...params,
        },
        queryParamsHandling: 'merge',
      });
    });
  }
}
