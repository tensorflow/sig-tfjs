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

import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, OnInit} from '@angular/core';
import {MatSelectChange} from '@angular/material/select';
import {Store} from '@ngrx/store';
import {takeWhile} from 'rxjs';
import {LOCAL_BUILD_LAEL} from 'src/app/common/consts';
import {ConfigIndex, UrlParamKey} from 'src/app/common/types';
import {appendConfigIndexToKey} from 'src/app/common/utils';
import {BackendId} from 'src/app/data_model/backend_type';
import {TfjsRelease} from 'src/app/data_model/tfjs_release';
import {UrlService} from 'src/app/services/url_service';
import {setTfjsBackendId} from 'src/app/store/actions';
import {selectConfigValueFromUrl, selectSelectedTfjsRelease, selectTfjsReleases} from 'src/app/store/selectors';
import {AppState} from 'src/app/store/state';

import {BackendOption} from './types';

/**
 * A selector for users to select backend.
 */
@Component({
  selector: 'backend-selector',
  templateUrl: './backend_selector.component.html',
  styleUrls: ['./backend_selector.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackendSelector implements OnInit, OnDestroy {
  @Input() configIndex: ConfigIndex = 0;

  /** All supported backends.  */
  readonly backends: BackendOption[] = [
    {
      id: BackendId.WEBGL,
      label: 'WebGL',
    },
    {
      id: BackendId.WASM,
      label: 'WASM',
    },
    {
      id: BackendId.CPU,
      label: 'CPU',
    },
  ];

  /** Stores the currently selected backend. */
  selectedBackendId!: BackendId;

  selectedRelease = '';

  localServerCommand = `yarn\nyarn start-local-debugger-server`;

  private active = true;

  constructor(
      private readonly changeDetectorRef: ChangeDetectorRef,
      private readonly store: Store<AppState>,
      private readonly urlService: UrlService,
  ) {}

  ngOnInit() {
    // Update currently selected backend from URL.
    this.store
        .select(selectConfigValueFromUrl(
            this.configIndex, UrlParamKey.SELECTED_BACKEND_ID))
        .pipe(takeWhile(() => this.active))
        .subscribe((strId) => {
          // The first one is the default.
          let backendId = this.backends[0].id;
          if (strId != null) {
            backendId = strId;
          }
          this.selectedBackendId = backendId;
          this.changeDetectorRef.markForCheck();

          // Update store.
          this.store.dispatch(setTfjsBackendId({
            configIndex: this.configIndex,
            backendId,
          }));
        });

    this.store.select(selectSelectedTfjsRelease(this.configIndex))
        .pipe(takeWhile(() => this.active))
        .subscribe((release) => {
          if (!release) {
            return;
          }

          this.selectedRelease = release;
          this.changeDetectorRef.markForCheck();
        });
  }

  ngOnDestroy() {
    this.active = false;
  }

  handleSelectionChange(event: MatSelectChange) {
    const backendId = event.value as BackendId;

    // Update url with selected backend id.
    this.urlService.updateUrlParameters({
      [appendConfigIndexToKey(
          UrlParamKey.SELECTED_BACKEND_ID, this.configIndex)]: `${backendId}`
    });
  }

  handleCopyLocalServerCommand() {
    navigator.clipboard.writeText(this.localServerCommand);
  }

  isLocalBuildSelected(): boolean {
    return this.selectedRelease === LOCAL_BUILD_LAEL;
  }

  isLocalServer(): boolean {
    const host = window.location.host;
    return host.includes('localhost') || host.includes('127.0.0.1');
  }
}
