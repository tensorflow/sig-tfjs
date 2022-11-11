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

import {Injectable} from '@angular/core';
import {Store} from '@ngrx/store';

import {CalculateDiffsRequest, CalculateDiffsResponse, WorkerCommand, WorkerMessage} from '../common/types';
import {RunTask, TaskStatus} from '../data_model/misc';
import {TensorMap} from '../data_model/run_results';
import {setDiffs, updateRunTaskStatus} from '../store/actions';
import {AppState} from '../store/state';

/**
 * Service for run results related tasks.
 */
@Injectable({
  providedIn: 'root',
})
export class RunResultService {
  private diffCalculatorWorker =
      new Worker(new URL('../workers/diff_calculator.worker', import.meta.url));

  private curResult1?: TensorMap;
  private curResult2?: TensorMap;

  constructor(
      private readonly store: Store<AppState>,
  ) {
    this.diffCalculatorWorker.onmessage = ({data}) => {
      const msg = data as WorkerMessage;
      if (msg.cmd === WorkerCommand.CALCULATE_DIFFS_RESULT) {
        const resp = msg as CalculateDiffsResponse;
        const diffs = resp.diffs;
        this.curResult1 = resp.results1;
        this.curResult2 = resp.results2;

        // Update store.
        this.store.dispatch(setDiffs({diffs}));

        // Update task status.
        this.store.dispatch(updateRunTaskStatus({
          task: RunTask.CALCULATE_DIFFS,
          status: TaskStatus.SUCCESS,
        }));
      }
    };
  }

  setResultsAndCalculateDiffs(result1: TensorMap, result2?: TensorMap) {
    // Store results.
    this.curResult1 = result1;
    this.curResult2 = result2;

    if (result2) {
      // Create worker to calculate diffs.
      const req: CalculateDiffsRequest = {
        cmd: WorkerCommand.CALCULATE_DIFFS,
        result1,
        result2,
      };
      this.diffCalculatorWorker.postMessage(req, [
        ...Object.values(result1).map(v => v.values.buffer),
        ...Object.values(result2).map(v => v.values.buffer),
      ]);
    } else {
      this.store.dispatch(setDiffs({diffs: {}}));
    }
  }

  get result1() {
    return this.curResult1;
  }

  get result2() {
    return this.curResult2;
  }
}
