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

/** An error message with title and content. */
export interface ErrorMessage {
  title: string;
  content: string;
}

/** Names of possible tasks in a run. */
export enum RunTask {
  LOAD_TFJS_MODEL1 = 'Load TJFS model in config 1',
  LOAD_TFJS_MODEL2 = 'Load TJFS model in config 2',
  LAYOUT_AND_RENDER_MODEL_GRAPH = 'Layout and render model graph',
  RUN_CONFIG1 = 'Run configuration 1',
  RUN_CONFIG2 = 'Run configuration 2',
  CALCULATE_DIFFS = 'Calculate diffs',
}

/** Status for a task. */
export enum TaskStatus {
  IN_PROGRESS,
  SUCCESS,
  FAILED,
}

/** Status indexed by task names. */
export type RunStatus = {
  [task: string]: TaskStatus
};
