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

import {ModelGraph, ModelGraphLayout} from '../data_model/run_results';

/** URL parameter keys. */
export enum UrlParamKey {
  SELECTED_MODEL_TYPE_ID = 'mid',
  TFJS_MODEL_URL = 'tfjsmu',
  SELECTED_INPUT_TYPE_ID = 'iid',
  SELECTED_BACKEND_ID = 'bi',
  SELECTED_BACKEND_VERSION = 'bv',
}

/** Valid config index. */
export type ConfigIndex = 0|1;

/** Message sent between main app and layout worker. */
export interface WorkerMessage {
  cmd: WorkerCommand;
}

export interface LayoutRequest extends WorkerMessage {
  configIndex: number;
  /** The model graph to calculate layout for. */
  modelGraph: ModelGraph;
}

export interface LayoutResponse extends WorkerMessage {
  configIndex: number;
  /** The layout result. */
  modelGraphLayout: ModelGraphLayout;
}

/** Possible commands for the msg. */
export enum WorkerCommand {
  LAYOUT = 'layout',
  LAYOUT_RESULT = 'layout_result',
}
