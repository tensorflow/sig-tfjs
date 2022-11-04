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

/// <reference lib="webworker" />

import {CalculateDiffsRequest, CalculateDiffsResponse, WorkerCommand, WorkerMessage} from '../common/types';
import {Diffs} from '../data_model/run_results';

addEventListener('message', ({data}) => {
  const msg = data as WorkerMessage;
  switch (msg.cmd) {
    case WorkerCommand.CALCULATE_DIFFS:
      calculateDiffs(msg as CalculateDiffsRequest);
      break;
    default:
      break;
  }
});

function calculateDiffs(req: CalculateDiffsRequest) {
  const diffs: Diffs = {};
  for (const id of Object.keys(req.result1)) {
    const curResult1 = req.result1[id];
    const curResult2 = req.result2[id];
    if (curResult2 == null) {
      console.warn(`node id ${id} not exist in config2's result`);
      continue;
    }
    if (curResult1.values.length !== curResult2.values.length) {
      console.warn(`values length diffs between config1 and config2's result (${
          curResult1.values.length} vs ${curResult2.values.length})`);
      continue;
    }
    let sum = 0;
    let sumDiff = 0;
    const len = curResult1.values.length;
    for (let i = 0; i < len; i++) {
      sum += Math.abs(curResult2.values[i]);
      sumDiff += Math.abs(curResult1.values[i] - curResult2.values[i]);
    }
    sum /= len;
    sumDiff /= len;
    let diff = sumDiff / sum;
    if (sum === 0) {
      diff = (sumDiff < 1e-7) ? 0 : Infinity;
    }

    diffs[id] = diff;
  }
  const resp: CalculateDiffsResponse = {
    cmd: WorkerCommand.CALCULATE_DIFFS_RESULT,
    diffs,
    results1: req.result1,
    results2: req.result2,
  };
  postMessage(resp, [
    ...Object.values(req.result1).map(t => t.values.buffer),
    ...Object.values(req.result2).map(t => t.values.buffer)
  ]);
}
