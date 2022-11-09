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
import {Store} from '@ngrx/store';
import {LOCAL_BUILD_LAEL} from 'src/app/common/consts';
import {ModelTypeId} from 'src/app/data_model/model_type';
import {triggerRunCurrentConfigs} from 'src/app/store/actions';
import {selectCurrentConfigs} from 'src/app/store/selectors';
import {AppState, Configs} from 'src/app/store/state';

/**
 * The app bar located at the top of the screen that shows the app title and a
 * set of action buttons.
 */
@Component({
  selector: 'app-bar',
  templateUrl: './app_bar.component.html',
  styleUrls: ['./app_bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppBar implements OnInit {
  private curConfigs?: Configs;

  constructor(
      private readonly changeDetectorRef: ChangeDetectorRef,
      private readonly store: Store<AppState>,
  ) {}

  handleClickRun(event: MouseEvent) {
    // Don't leave focus on the button.
    (event.target as HTMLElement).blur();

    // Triggers a run for the current configs when the "Run" button is clicked.
    this.store.dispatch(triggerRunCurrentConfigs());
  }

  ngOnInit() {
    // Stores the current configs when it changes.
    this.store.select(selectCurrentConfigs).subscribe(curConfigs => {
      this.curConfigs = curConfigs;
      this.changeDetectorRef.markForCheck();
    });
  }

  /**
   * Returns the tooltip that will be shown when the Run button is disabled to
   * give users hint about why the button is disabled (e.g. didn't fill out the
   * required fields, etc).
   */
  get runButtonDisabledMessage(): string {
    if (!this.curConfigs) {
      return 'Configs not initialized';
    }

    const config1 = this.curConfigs.config1;
    const config2 = this.curConfigs.config2;

    // TODO: add more check conditions.
    if (config1.modelType === ModelTypeId.TFJS) {
      if (config1.tfjsModelUrl == null || config1.tfjsModelUrl === '') {
        return 'TFJS model url required in configuration 1';
      }
      if (config1.backendVersion === LOCAL_BUILD_LAEL &&
          !this.isLocalServer()) {
        return 'Local build can only be used on local server. ' +
            'See instructions in configuration 1.';
      }
      return '';
    }

    if (config2.modelType === ModelTypeId.TFJS) {
      return (config2.tfjsModelUrl == null || config2.tfjsModelUrl === '') ?
          'TFJS model url required in configuration 2' :
          '';
    }

    return '';
  }

  private isLocalServer(): boolean {
    const host = window.location.host;
    return host.includes('localhost') || host.includes('127.0.0.1');
  }
}
