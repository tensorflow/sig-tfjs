import {Injectable} from '@angular/core';
import {Store} from '@ngrx/store';
import {index} from 'd3';

import {CalculateDiffsRequest, CalculateDiffsResponse, WorkerCommand, WorkerMessage} from '../common/types';
import {RunTask, TaskStatus} from '../data_model/misc';
import {TensorMap} from '../data_model/run_results';
import {setDiffs, updateRunTaskStatus} from '../store/actions';
import {AppState} from '../store/state';

/**
 * Service for url related tasks.
 */
@Injectable({
  providedIn: 'root',
})
export class RunResultService {
  constructor(
      private readonly store: Store<AppState>,
  ) {}

  setResultsAndCalculateDiffs(result1: TensorMap, result2: TensorMap) {
    // Create worker to calculate diffs.
    const diffCalculatorWorker = new Worker(
        new URL('../workers/diff_calculator.worker', import.meta.url));
    const req: CalculateDiffsRequest = {
      cmd: WorkerCommand.CALCULATE_DIFFS,
      result1,
      result2,
    };
    diffCalculatorWorker.onmessage = ({data}) => {
      const msg = data as WorkerMessage;
      if (msg.cmd === WorkerCommand.CALCULATE_DIFFS_RESULT) {
        const diffs = (msg as CalculateDiffsResponse).diffs;

        // Update store.
        this.store.dispatch(setDiffs({diffs}));

        // Update task status.
        this.store.dispatch(updateRunTaskStatus({
          task: RunTask.CALCULATE_DIFFS,
          status: TaskStatus.SUCCESS,
        }));
      }
    };
    diffCalculatorWorker.postMessage(req, [
      ...Object.values(result1).map(v => v.values.buffer),
      ...Object.values(result2).map(v => v.values.buffer),
    ]);
  }
}
