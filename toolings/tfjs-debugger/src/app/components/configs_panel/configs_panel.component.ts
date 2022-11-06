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

import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {MatSlideToggleChange} from '@angular/material/slide-toggle';
import {Store} from '@ngrx/store';
import {takeWhile} from 'rxjs';
import {UrlParamKey} from 'src/app/common/types';
import {appendConfigIndexToKey} from 'src/app/common/utils';
import {UrlService} from 'src/app/services/url_service';
import {setConfigEnabled, setTfjsBackendId} from 'src/app/store/actions';
import {selectConfigValueFromUrl} from 'src/app/store/selectors';
import {AppState} from 'src/app/store/state';

/**
 * The configs panel located at the left of the screen where users set up 2
 * configurations for comparison (or 1 configuration for single-configuration
 * mode).
 *
 * Each configuration section is implemented in the `config-section` component.
 */
@Component({
  selector: 'configs-panel',
  templateUrl: './configs_panel.component.html',
  styleUrls: ['./configs_panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfigsPanel implements OnInit {
  config2Enabled = true;

  constructor(
      private readonly changeDetectorRef: ChangeDetectorRef,
      private readonly store: Store<AppState>,
      private readonly urlService: UrlService,
  ) {}

  ngOnInit() {
    // Update config2's enabled/disabled status.
    this.store.select(selectConfigValueFromUrl(1, UrlParamKey.CONFIG_ENABLED))
        .subscribe((strEnabled) => {
          if (strEnabled == null) {
            this.config2Enabled = true;
          } else {
            this.config2Enabled = strEnabled === 'true';
          }
          this.changeDetectorRef.markForCheck();

          // Update store.
          this.store.dispatch(setConfigEnabled({
            configIndex: 1,
            enabled: this.config2Enabled,
          }));
        });
  }

  handleConfig2Toggled(event: MatSlideToggleChange) {
    // Update url with selected backend id.
    this.urlService.updateUrlParameters({
      [appendConfigIndexToKey(UrlParamKey.CONFIG_ENABLED, 1)]:
          `${event.checked}`
    });
  }
}
