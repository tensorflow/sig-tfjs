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

import {Configuration} from '../data_model/configuration';
import {Input} from '../data_model/input';
import {ErrorMessage, RunStatus} from '../data_model/misc';
import {ModelTypeId} from '../data_model/model_type';
import {RunResults} from '../data_model/run_results';
import {TfjsRelease} from '../data_model/tfjs_release';

export interface Configs {
  config1: Configuration;
  config2: Configuration;
}

/** The main app state. */
export interface AppState {
  configs: Configs;
  inputs: Input[];
  tfjsReleases: TfjsRelease[];

  /**
   * Any new (empty) object that is set to this field will trigger a run for the
   * currently stored configs.
   */
  runCurrentConfigsTrigger?: {};

  /** Stores the results for the latest run. */
  runResults: RunResults;

  /**
   * Stores the status of various tasks (e.g. loading models, running
   * inferences, etc) during a run.
   *
   * This will mainly be used to render an overlay that shows progress during a
   * run. The overlay will be hidden if this value is set to undefined.
   */
  runStatus?: RunStatus;

  /** Stores the currently selected node id. */
  selectedNodeId?: string;

  /** Stores the id of the node to locate. */
  nodeIdToLocate?: {id: string};

  /**
   * The current error message occurred in the app.
   *
   * A panel with the error message will be displayed from the main app
   * component.
   */
  errorMessage?: ErrorMessage;
}

/** The initial app state. */
export const initialState: AppState = {
  configs: {
    config1: {
      modelType: ModelTypeId.TFJS,
    },
    config2: {
      modelType: ModelTypeId.SAME_AS_CONFIG1,
    }
  },
  inputs: [],
  tfjsReleases: [],
  runResults: {},
};
