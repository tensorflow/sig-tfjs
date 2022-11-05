/**
 * @license
 * Copyright 2022 Google LLC. All Rights Reserved.
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

import {RunStatus, RunTask, TaskStatus} from '../data_model/misc';
import {ModelTypeId} from '../data_model/model_type';

import {Configs} from './state';

/** Gets tasks in a run given its configs. */
export function getRunTasksFromConfigs(configs: Configs): RunTask[] {
  // TODO: for now we only handle loading one TFJS model from config1. Add more
  // as needed in the future.
  if (configs.config1.modelType === ModelTypeId.TFJS &&
      configs.config2.modelType === ModelTypeId.SAME_AS_CONFIG1) {
    return [
      RunTask.LOAD_TFJS_MODEL1,
      RunTask.LAYOUT_AND_RENDER_MODEL_GRAPH,
      RunTask.RUN_CONFIG1,
      RunTask.RUN_CONFIG2,
      RunTask.CALCULATE_DIFFS,
    ];
  }
  return [];
}

/** Checks whether all the run tasks are done successfully. */
export function checkAllTasksDone(runStatus: RunStatus): boolean {
  for (const task of Object.keys(runStatus)) {
    if (runStatus[task] !== TaskStatus.SUCCESS) {
      return false;
    }
  }
  return true;
}
