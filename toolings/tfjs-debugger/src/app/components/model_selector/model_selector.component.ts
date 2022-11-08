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
import {Subject, takeWhile} from 'rxjs';
import {ConfigIndex, UrlParamKey} from 'src/app/common/types';
import {appendConfigIndexToKey} from 'src/app/common/utils';
import {ModelTypeId} from 'src/app/data_model/model_type';
import {UrlService} from 'src/app/services/url_service';
import {setModelType, setShowConstNodes, setTfjsModelUrl} from 'src/app/store/actions';
import {selectConfigValueFromUrl, selectShowConstNodes} from 'src/app/store/selectors';
import {AppState} from 'src/app/store/state';

import {ModelItem} from './model_menu.component';
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

  publishedModels: ModelItem[] = [
    {
      label: 'Mobilenet V2',
      url:
          'https://tfhub.dev/google/tfjs-model/imagenet/mobilenet_v2_100_224/classification/3/default/1',
    },
    {
      label: 'Mobilenet V3',
      url:
          'https://tfhub.dev/google/tfjs-model/imagenet/mobilenet_v3_large_100_224/classification/5/default/1',
    },
    {
      label: 'Hand pose detector',
      url: 'https://tfhub.dev/mediapipe/tfjs-model/handpose_3d/detector/{}/1',
      children: ['lite', 'full']
    },
    {

      label: 'Hand pose landmark',
      url: `https://tfhub.dev/mediapipe/tfjs-model/handpose_3d/landmark/{}/1`,
      children: ['lite', 'full']
    },
    {
      label: 'BlazePose detector',
      url:
          'https://tfhub.dev/mediapipe/tfjs-model/blazeposedetector/1/default/1',
    },
    {

      label: 'BlazePose landmark',
      url:
          'https://tfhub.dev/mediapipe/tfjs-model/blazeposelandmark_{}/2/default/2',
    },
    {
      label: 'Movenet single pose',
      url: 'https://tfhub.dev/google/tfjs-model/movenet/singlepose/{}/4',
      children: ['lightning', 'thunder']
    },
    {
      label: 'Movenet multipose lightning',
      url: 'https://tfhub.dev/google/tfjs-model/movenet/multipose/lightning/1',
    },
    {
      label: 'Posenet',
      url:
          'https://storage.googleapis.com/tfjs-models/savedmodel/posenet/mobilenet/float/075/model-stride16.json',
    },
    {
      label: 'Coco SSD',
      url: '',
      children:
          [
            {
              label: 'Mobilenet V1',
              url:
                  'https://storage.googleapis.com/tfjs-models/savedmodel/ssd_mobilenet_v1/model.json',
            },
            {
              label: 'Mobilenet V2',
              url:
                  'https://storage.googleapis.com/tfjs-models/savedmodel/ssd_mobilenet_v2/model.json',
            },
            {
              label: 'Lite mobilenet v2',
              url:
                  'https://storage.googleapis.com/tfjs-models/savedmodel/ssdlite_mobilenet_v2/model.json'
            }
          ]
    },
    {
      label: 'DeeplabV3',
      url:
          'https://storage.googleapis.com/tfhub-tfjs-modules/tensorflow/tfjs-model/deeplab/{}/1/quantized/2/1/model.json',
      children: ['pascal', 'ade20k']
    },
    {
      label: 'Face detection',
      url: 'https://tfhub.dev/mediapipe/tfjs-model/face_detection/{}/1',
      children: ['short', 'full']
    },
    {
      label: 'Face landmark detection',
      url:
          'https://tfhub.dev/mediapipe/tfjs-model/face_landmarks_detection/{}/1',
      children: ['attention_mesh', 'face_mesh'],
    },
    {
      label: 'AR portrait depth',
      url: 'https://tfhub.dev/tensorflow/tfjs-model/ar_portrait_depth/1',
    },
    {
      label: 'Selfie segmentation',
      url: 'https://tfhub.dev/mediapipe/tfjs-model/selfie_segmentation/{}/1',
      children: ['general', 'landscape']
    },
    {
      label: 'AutoML image',
      url:
          'https://storage.googleapis.com/tfjs-testing/tfjs-automl/img_classification/model.json',
    },
    {
      label: 'TextToxicity',
      url:
          'https://storage.googleapis.com/tfhub-tfjs-modules/tensorflow/tfjs-model/toxicity/1/default/1/model.json',
    },
    {
      label: 'Mobile bert',
      url: 'https://tfhub.dev/tensorflow/tfjs-model/mobilebert/1',
    },
    // TODO(jingjin): this model needs hashtable input that is not supported for
    // now.
    //
    // {
    //   label: 'AutoML object',
    //   url:
    //       'https://storage.googleapis.com/tfjs-testing/tfjs-automl/object_detection/model.json',
    // },
  ].sort((a, b) => a.label.localeCompare(b.label));

  modelUrlSubject = new Subject<string>();

  /** All supported model types.  */
  readonly modelTypes: ModelTypeOption[] = [
    {
      id: ModelTypeId.TFJS,
      label: 'TFJS model',
    },
    // TODO: the following types are disabled for now. Will enable them as
    // they are implemented.
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

  /** Stores whether to show the const nodes in graph. */
  showConstNodes = false;

  private active = true;

  constructor(
      private readonly changeDetectorRef: ChangeDetectorRef,
      private readonly store: Store<AppState>,
      private readonly urlService: UrlService,
  ) {}

  ngOnInit() {
    // Add "Same as configuration 1" option when the model selector is used
    // in the configuration 2.
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
            modelTypeId = strId;
          }
          this.selectedModelTypeId = modelTypeId;
          this.changeDetectorRef.markForCheck();

          // Update store.
          this.store.dispatch(setModelType({
            configIndex: this.configIndex,
            modelType: modelTypeId,
          }));
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

            // Update store.
            this.store.dispatch(setTfjsModelUrl({
              configIndex: this.configIndex,
              url,
            }));
          }
        });

    // Update show const nodes from URL.
    this.store
        .select(selectConfigValueFromUrl(
            this.configIndex, UrlParamKey.SHOW_CONST_NODES))
        .pipe(takeWhile(() => this.active))
        .subscribe((strShow) => {
          this.showConstNodes = strShow === 'true';

          // Update store.
          this.store.dispatch(setShowConstNodes({
            configIndex: this.configIndex,
            showConstNodes: this.showConstNodes,
          }));
        });

    this.modelUrlSubject.subscribe(url => {
      this.handleSelectedPublishedModelUrlChanged(url);
    });
  }

  ngOnDestroy() {
    this.active = false;
  }

  handleSelectionChange(event: MatSelectChange) {
    const modelTypeId = event.value as ModelTypeId;

    // Do things after a new model type is selected.
    //
    // Note that this method will only be triggered through user actions
    // (e.g. click the drop down and select an item), not other non-user
    // actions such as restoring states from URL or going forward/backward
    // in browser history.
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

  handleSelectedPublishedModelUrlChanged(url: string) {
    this.tfjsModelUrl = url;
    this.handleTfjsModelUrlChanged();
  }

  handleShowConstNodesUpdated() {
    this.urlService.updateUrlParameters({
      [appendConfigIndexToKey(UrlParamKey.SHOW_CONST_NODES, this.configIndex)]:
          `${this.showConstNodes}`,
    });
  }

  get isSameAsConfig1Selected(): boolean {
    return this.selectedModelTypeId === ModelTypeId.SAME_AS_CONFIG1;
  }
}
