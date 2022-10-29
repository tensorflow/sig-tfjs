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
  };
  postMessage(resp);
}
