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
import {ConfigIndex, UrlParamKey} from 'src/app/common/types';
import {appendConfigIndexToKey} from 'src/app/common/utils';
import {InputTypeId} from 'src/app/data_model/input_type';
import {UrlService} from 'src/app/services/url_service';
import {selectConfigValueFromUrl} from 'src/app/store/selectors';
import {AppState} from 'src/app/store/state';

import {InputTypeOption} from './types';

/**
 * A selector for users to select the type of input (e.g. random, const, image,
 * etc) to the model.
 */
@Component({
  selector: 'input-selector',
  templateUrl: './input_selector.component.html',
  styleUrls: ['./input_selector.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputSelector implements OnInit, OnDestroy {
  @Input() configIndex: ConfigIndex = 0;

  /** All supported input types.  */
  readonly inputTypes: InputTypeOption[] = [
    {
      id: InputTypeId.RANDOM,
      label: 'Random',
    },
    // TODO: the following types are disabled for now. Will enable them as they
    // are implemented.
    {
      id: InputTypeId.CUSTOM_VALUE,
      label: 'Custom value',
      disabled: true,
    },
    {
      id: InputTypeId.IMAGE,
      label: 'Image',
      disabled: true,
    },
  ];

  /** Stores the currently selected input type. */
  selectedInputTypeId!: InputTypeId;

  private active = true;

  constructor(
      private readonly changeDetectorRef: ChangeDetectorRef,
      private readonly store: Store<AppState>,
      private readonly urlService: UrlService,
  ) {}

  ngOnInit() {
    // Add "Same as configuration 1" option when the input selector is used in
    // the configuration 2.
    if (this.configIndex === 1) {
      this.inputTypes.unshift({
        id: InputTypeId.SAME_AS_CONFIG1,
        label: 'Same as configuration 1',
      });
    }

    // Update currently selected input type from URL.
    this.store
        .select(selectConfigValueFromUrl(
            this.configIndex, UrlParamKey.SELECTED_INPUT_TYPE_ID))
        .pipe(takeWhile(() => this.active))
        .subscribe((strId) => {
          // The first one is the default.
          let inputTypeId = this.inputTypes[0].id;
          if (strId != null) {
            inputTypeId = strId;
          }
          this.selectedInputTypeId = inputTypeId;
          this.changeDetectorRef.markForCheck();

          // TODO: update configs in store.
        });
  }

  ngOnDestroy() {
    this.active = false;
  }

  handleSelectionChange(event: MatSelectChange) {
    const inputTypeId = event.value as InputTypeId;

    // TODO: add other logic as needed to handle selection change (e.g. show
    // certain UI elements when an item is selected).

    // Update url with selected input type id.
    this.urlService.updateUrlParameters({
      [appendConfigIndexToKey(
          UrlParamKey.SELECTED_INPUT_TYPE_ID, this.configIndex)]:
          `${inputTypeId}`
    });
  }

  get isSameAsConfig1Selected(): boolean {
    return this.selectedInputTypeId === InputTypeId.SAME_AS_CONFIG1;
  }
}
