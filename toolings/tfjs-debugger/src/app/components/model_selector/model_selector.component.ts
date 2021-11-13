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

import {ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {MatSelectChange} from '@angular/material/select';
import {Store} from '@ngrx/store';
import {takeWhile} from 'rxjs';
import {ConfigIndex, UrlParamKey} from 'src/app/common/types';
import {appendConfigIndexToKey} from 'src/app/common/utils';
import {ModelTypeId} from 'src/app/data_model/model_type';
import {UrlService} from 'src/app/services/url_service';
import {selectConfigValueFromUrl} from 'src/app/store/selectors';
import {AppState} from 'src/app/store/state';

import {ModelTypeOption} from './types';

/**
 * A selector for users to select model type. After a model type is selected,
 * the corresponding UI elements will be shown to gather more data from users
 * for the selected model type.
 *
 * For example: when a user selects "TFJS model" from the selector, a text field
 * will be shown for users to enter the model url.
 */
@Component({
  selector: 'model-selector',
  templateUrl: './model_selector.component.html',
  styleUrls: ['./model_selector.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModelSelector implements OnInit, OnDestroy {
  @Input() configIndex: ConfigIndex = 0;

  @ViewChild('tfjsModelUrlInput')
  tfjsModelUrlInput!: ElementRef<HTMLInputElement>;

  // Used by template.
  ModelTypeId = ModelTypeId;

  /** All supported model types.  */
  readonly modelTypes: ModelTypeOption[] = [
    {
      id: ModelTypeId.TFJS,
      label: 'TFJS model',
    },
    // TODO: the following types are disabled for now. Will enable them as they
    // are implemented.
    {
      id: ModelTypeId.TF,
      label: 'TF model',
      disabled: true,
    },
    {
      id: ModelTypeId.TFLITE,
      label: 'TFLite model',
      disabled: true,
    },
    {
      id: ModelTypeId.TFJS_CUSTOM_GRAPH,
      label: 'Custom TFJS model graph',
      disabled: true,
    },
  ];

  /** Stores the currently selected model type. */
  selectedModelTypeId!: ModelTypeId;

  /** Stores the current tfjs model url */
  tfjsModelUrl = '';

  private active = true;

  constructor(
      private readonly changeDetectorRef: ChangeDetectorRef,
      private readonly store: Store<AppState>,
      private readonly urlService: UrlService,
  ) {}

  ngOnInit() {
    // Add "Same as configuration 1" option when the model selector is used in
    // the configuration 2.
    if (this.configIndex === 1) {
      this.modelTypes.unshift({
        id: ModelTypeId.SAME_AS_CONFIG1,
        label: 'Same as configuration 1',
      });
    }

    // Update currently selected model type from URL.
    this.store
        .select(selectConfigValueFromUrl(
            this.configIndex, UrlParamKey.SELECTED_MODEL_TYPE_ID))
        .pipe(takeWhile(() => this.active))
        .subscribe((strId) => {
          // The first one is the default.
          let modelTypeId = this.modelTypes[0].id;
          if (strId != null) {
            modelTypeId = Number(strId);
          }
          this.selectedModelTypeId = modelTypeId;
          this.changeDetectorRef.markForCheck();

          // TODO: update configs in store.
        });

    // Update tfjs model url from URL.
    this.store
        .select(selectConfigValueFromUrl(
            this.configIndex, UrlParamKey.TFJS_MODEL_URL))
        .pipe(takeWhile(() => this.active))
        .subscribe((url) => {
          if (this.tfjsModelUrlInput?.nativeElement) {
            this.tfjsModelUrl = url;
            this.changeDetectorRef.markForCheck();

            // TODO: update configs in store.
          }
        });
  }

  ngOnDestroy() {
    this.active = false;
  }

  handleSelectionChange(event: MatSelectChange) {
    const modelTypeId = event.value as ModelTypeId;

    // Do things after a new model type is selected.
    //
    // Note that this method will only be triggered through user actions (e.g.
    // click the drop down and select an item), not other non-user actions such
    // as restoring states from URL or going forward/backward in browser
    // history.
    switch (modelTypeId) {
      // Immediately focus on the the model url input whenn "TFJS model" is
      // selected.
      case ModelTypeId.TFJS:
        setTimeout(() => {
          this.tfjsModelUrlInput.nativeElement.focus();
        });
        break;
      default:
        break;
    }

    // Update url with selected model type id.
    this.urlService.updateUrlParameters({
      [appendConfigIndexToKey(
          UrlParamKey.SELECTED_MODEL_TYPE_ID, this.configIndex)]:
          `${modelTypeId}`
    });
  }

  handleTfjsModelUrlChanged() {
    // Update url with the TFJS model url when it is changed.
    this.urlService.updateUrlParameters({
      [appendConfigIndexToKey(UrlParamKey.TFJS_MODEL_URL, this.configIndex)]:
          `${this.tfjsModelUrl}`,
    });
  }

  get isSameAsConfig1Selected(): boolean {
    return this.selectedModelTypeId === ModelTypeId.SAME_AS_CONFIG1;
  }
}
