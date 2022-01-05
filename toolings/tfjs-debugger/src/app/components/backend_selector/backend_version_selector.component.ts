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
import {distinctUntilChanged, takeWhile} from 'rxjs';
import {ConfigIndex, UrlParamKey} from 'src/app/common/types';
import {appendConfigIndexToKey} from 'src/app/common/utils';
import {TfjsRelease} from 'src/app/data_model/tfjs_release';
import {UrlService} from 'src/app/services/url_service';
import {selectConfigValueFromUrl, selectTfjsReleases} from 'src/app/store/selectors';
import {AppState} from 'src/app/store/state';

/**
 * A selector for users to select TFJS release/version.
 */
@Component({
  selector: 'backend-version-selector',
  templateUrl: './backend_version_selector.component.html',
  styleUrls: ['./backend_version_selector.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackendVersionSelector implements OnInit, OnDestroy {
  @Input() configIndex: ConfigIndex = 0;

  readonly releases: TfjsRelease[] = [];

  /** Stores the currently selected version. */
  selectedVersion!: string;

  private active = true;
  /** This is for efficiently lookup TfjsRelease by version. */
  private readonly releasesMap = new Map<string, TfjsRelease>();

  constructor(
      private readonly changeDetectorRef: ChangeDetectorRef,
      private readonly store: Store<AppState>,
      private readonly urlService: UrlService,
  ) {}

  ngOnInit() {
    // Get the fetched TFJS releases and update selector options.
    this.store.select(selectTfjsReleases)
        .pipe(takeWhile(() => this.active))
        .subscribe(releases => {
          if (releases.length === 0) {
            return;
          }

          // Store locally.
          this.releases.push(...releases);
          for (const release of releases) {
            this.releasesMap.set(release.version, release);
          }

          // Only set default value if selectedVersion has not been set from
          // url.
          if (!this.selectedVersion) {
            this.selectedVersion = this.releases[0].version;

            // Update url with the default version.
            //
            // This is necessary because default value might change over time
            // (e.g. when we release new versions). We encode the actual version
            // number to url to make sure the url always points to the correct
            // version that user was looking at.
            //
            // We don't do this for other form fields because their default
            // values rarely change.
            this.updateUrlWithVersion(this.selectedVersion);
          }
          this.changeDetectorRef.markForCheck();
        });

    // Update currently selected backend version from URL.
    this.store
        .select(selectConfigValueFromUrl(
            this.configIndex, UrlParamKey.SELECTED_BACKEND_VERSION))
        .pipe(
            takeWhile(() => this.active),
            distinctUntilChanged(),
            )
        .subscribe(strVersion => {
          let version = '';

          // Set default version.
          if (this.releases.length > 0 && !this.selectedVersion) {
            version = this.releases[0].version;

            // Update url with the default version.
            //
            // See comments above about why this is necessary.
            if (!strVersion) {
              this.updateUrlWithVersion(version);
            }
          }
          if (strVersion) {
            version = strVersion;
          }

          if (version) {
            this.selectedVersion = version;
            this.changeDetectorRef.markForCheck();
          }

          // TODO: update configs in store.
        });
  }

  ngOnDestroy() {
    this.active = false;
  }

  handleSelectionChange(event: MatSelectChange) {
    const version = event.value as string;

    // Update url with selected version.
    this.updateUrlWithVersion(version);
  }

  getDate(version: string): string {
    if (!this.releasesMap.has(version)) {
      return '';
    }
    return this.releasesMap.get(version)!.date;
  }

  get releasesLoaded(): boolean {
    return this.releases.length > 0;
  }

  private updateUrlWithVersion(version: string) {
    this.urlService.updateUrlParameters({
      [appendConfigIndexToKey(
          UrlParamKey.SELECTED_BACKEND_VERSION, this.configIndex)]: version
    });
  }
}
