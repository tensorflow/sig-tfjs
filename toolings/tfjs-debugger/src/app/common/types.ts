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
import {Diffs, ModelGraph, ModelGraphLayout, ModelGraphLayoutEdge, ModelGraphNode, TensorMap, TypedArray} from '../data_model/run_results';

/** URL parameter keys. */
export enum UrlParamKey {
  SELECTED_MODEL_TYPE_ID = 'mid',
  TFJS_MODEL_URL = 'tfjsmu',
  SELECTED_INPUT_TYPE_ID = 'iid',
  SELECTED_BACKEND_ID = 'bi',
  SELECTED_BACKEND_VERSION = 'bv',
  LOCAL_BUILD_SETTING = 'lbs',
  SHOW_CONST_NODES = 'scn',
  CONFIG_ENABLED = 'ce',
  INPUTS = 'inputs',
  BAD_NODES_THRESHOLD = 'bnt',
}

/** Valid config index. */
export type ConfigIndex = 0|1;

/** Message sent between main app and layout worker. */
export interface WorkerMessage {
  cmd: WorkerCommand;
}

export interface LayoutRequest extends WorkerMessage {
  configIndex: number;
  config: Configuration;
  /** The model graph to calculate layout for. */
  modelGraph: ModelGraph;
}

export interface LayoutResponse extends WorkerMessage {
  configIndex: number;
  /** The layout result. */
  modelGraphLayout: ModelGraphLayout;
}

export interface LayoutBatchRequest extends WorkerMessage {
  nodes: ModelGraphNode[];
  align: 'DL'|'DR';
  batchIndex: number;
}

export interface LayoutBatchResponse extends WorkerMessage {
  nodes: ModelGraphNode[];
  edges: ModelGraphLayoutEdge[];
  align: 'DL'|'DR';
  batchIndex: number;
}

export interface ExecuteInputsCodeRequest extends WorkerMessage {
  latestTfjeRelease: string;
  code: string;
  tensors: ExecuteCodeTensor[];
}

export interface ExecuteCodeTensor {
  varName: string;
  values: TypedArray;
  shape: number[];
  dtype: string;
}

export interface ExecuteInputsCodeResponse extends WorkerMessage {
  error: string;
  tensorResults: TensorResults;
}

export type TensorResults = {
  [id: string]: {values: TypedArray; dtype: string}
};

export interface ExecutePostProcessingCodeRequest extends WorkerMessage {
  latestTfjeRelease: string;
  code: string;
  tensor: ExecuteCodeTensor;
  index: number;
}

export interface ExecutePostProcessingCodeResponse extends WorkerMessage {
  error: string;
  index: number;
  result?: PostProcessingResult;
}

export interface PostProcessingResult {
  type: 'string'|'canvas';
  strResult?: string;
  imageData?: ImageData;
}


/** Possible commands for the msg. */
export enum WorkerCommand {
  LAYOUT = 'layout',
  LAYOUT_RESULT = 'layout_result',
  LAYOUT_BATCH = 'layout_batch',
  LAYOUT_BATCH_RESULT = 'layout_batch_result',
  RUN_TFJS_MODEL = 'run_tfjs_model',
  RUN_TFJS_MODEL_RESULT = 'run_tfjs_model_result',
  CALCULATE_DIFFS = 'calculate_diffs',
  CALCULATE_DIFFS_RESULT = 'calculate_diffs_result',
  EXECUTE_INPUTS_CODE = 'execute_inputs_code',
  EXECUTE_INPUTS_CODE_RESULT = 'execute_input_code_result',
  EXECUTE_POST_PROCESSING_CODE = 'execute_post_processing_code',
  EXECUTE_POST_PROCESSING_CODE_RESULT = 'execute_post_processing_code_result',
}

export interface RunTfjsModelRequest extends WorkerMessage {
  modelGraph: ModelGraph;
  modelUrl: string;
  config: Configuration;
  showConstNodes: boolean;
  inputs: TensorMap;
}

export interface RunTfjsModelResponse extends WorkerMessage {
  outputs: TensorMap;
  errorMsg?: string;
}

export interface CalculateDiffsRequest extends WorkerMessage {
  result1: TensorMap;
  result2: TensorMap;
}

export interface CalculateDiffsResponse extends WorkerMessage {
  diffs: Diffs;
  results1: TensorMap;
  results2: TensorMap;
}
