/**
 * @license
 * Copyright 2022 Google LLC. All Rights Reserved.
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
import {Store} from '@ngrx/store';
import {takeWhile} from 'rxjs';
import {ConfigIndex, UrlParamKey} from 'src/app/common/types';
import {appendConfigIndexToKey} from 'src/app/common/utils';
import {LocalBuildSetting, PackageSource} from 'src/app/data_model/local_build_setting';
import {TfjsRelease} from 'src/app/data_model/tfjs_release';
import {UrlService} from 'src/app/services/url_service';
import {setTfjsLocalBuildSetting} from 'src/app/store/actions';
import {selectConfigValueFromUrl, selectTfjsReleases} from 'src/app/store/selectors';
import {AppState} from 'src/app/store/state';

/**
 * A selector for users to select backend.
 */
@Component({
  selector: 'local-build-config',
  templateUrl: './local_build_config.component.html',
  styleUrls: ['./local_build_config.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocalBuildConfig implements OnInit, OnDestroy {
  @Input() configIndex: ConfigIndex = 0;

  private active = true;

  /** This is for efficiently lookup TfjsRelease by version. */
  private readonly releasesMap = new Map<string, TfjsRelease>();

  readonly releases: TfjsRelease[] = [];
  PackageSource = PackageSource;
  backendSource: PackageSource = PackageSource.LOCAL;
  coreSource: PackageSource = PackageSource.RELEASE;
  converterSource: PackageSource = PackageSource.RELEASE;
  coreConvertSelectedVersion = '';

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

          // Only set default value if coreConvertSelectedVersion has not been
          // set from url.
          if (!this.coreConvertSelectedVersion) {
            this.coreConvertSelectedVersion = this.releases[0].version;
            this.updateStore(this.createLocalBuildSetting());
          }
          this.changeDetectorRef.markForCheck();
        });

    // Update data from URL.
    this.store
        .select(selectConfigValueFromUrl(
            this.configIndex, UrlParamKey.LOCAL_BUILD_SETTING))
        .pipe(takeWhile(() => this.active))
        .subscribe((str) => {
          if (!str) {
            // Send the default to the store.
            const setting = this.createLocalBuildSetting();
            this.updateStore(setting);
            return;
          }

          const setting = this.decodeLocalBuildSetting(str);
          this.backendSource = setting.backendSource;
          this.coreSource = setting.coreSource;
          this.converterSource = setting.converterSource;
          this.coreConvertSelectedVersion = setting.coreConverterReleaseVersion;
          this.changeDetectorRef.markForCheck();

          // Update store.
          this.updateStore(setting);
        });
  }

  ngOnDestroy() {
    this.active = false;
  }

  getDate(version: string): string {
    if (!this.releasesMap.has(version)) {
      return '';
    }
    return this.releasesMap.get(version)!.date;
  }

  updateUrl() {
    this.urlService.updateUrlParameters({
      [appendConfigIndexToKey(
          UrlParamKey.LOCAL_BUILD_SETTING, this.configIndex)]:
          this.encodeLocalBuildSetting()
    });
  }

  private createLocalBuildSetting() {
    const setting: LocalBuildSetting = {
      backendSource: this.backendSource,
      coreSource: this.coreSource,
      converterSource: this.converterSource,
      coreConverterReleaseVersion: this.coreConvertSelectedVersion,
    };
    return setting;
  }

  private updateStore(setting: LocalBuildSetting) {
    this.store.dispatch(setTfjsLocalBuildSetting({
      configIndex: this.configIndex,
      setting,
    }));
  }

  private encodeLocalBuildSetting(): string {
    return [
      this.backendSource,
      this.coreSource,
      this.converterSource,
      this.coreConvertSelectedVersion,
    ].join(',');
  }

  private decodeLocalBuildSetting(str: string): LocalBuildSetting {
    const parts = str.split(',');
    const backendSource = parts[0] as PackageSource;
    const coreSource = parts[1] as PackageSource;
    const converterSource = parts[2] as PackageSource;
    const coreConverterReleaseVersion = parts[3];
    return {
      backendSource,
      coreSource,
      converterSource,
      coreConverterReleaseVersion,
    };
  }
}
