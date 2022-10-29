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

import {BackendId} from './backend_type';
import {ModelTypeId} from './model_type';

export interface Configuration {
  /** The type of the model, e.g. TFJS, TFLite, etc. */
  modelType: ModelTypeId;

  /** The URL of the tfjs model's model.json file. */
  tfjsModelUrl?: string;

  /** Backend. */
  backendId?: BackendId;

  /** Backend version. */
  backendVersion?: string;
}
