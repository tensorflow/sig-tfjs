import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Store} from '@ngrx/store';
import {combineLatest, filter, Observable, shareReplay, withLatestFrom} from 'rxjs';

import {RunTfjsModelRequest, RunTfjsModelResponse, WorkerCommand, WorkerMessage} from '../common/types';
import {getTypedArrayFromInput} from '../common/utils';
import {Configuration} from '../data_model/configuration';
import {Input, InputValuesType} from '../data_model/input';
import {RunTask, TaskStatus} from '../data_model/misc';
import {ModelGraph, ModelJson, TensorMap} from '../data_model/run_results';
import {updateRunTaskStatus} from '../store/actions';
import {selectCurrentConfigs, selectCurrentInputs, selectModelGraph, selectRunCurrentConfigsTrigger} from '../store/selectors';
import {AppState, Configs} from '../store/state';

import {RunResultService} from './run_result_service';

const TFHUB_SEARCH_PARAM = '?tfjs-format=file';
const DEFAULT_MODEL_NAME = 'model.json';

/** Service for TFJS related tasks.  */
@Injectable({
  providedIn: 'root',
})
export class TfjsService {
  private modelJsonCache: {[url: string]: Observable<ModelJson>} = {};
  private finishedRunCount = 0;
  private result1?: TensorMap;
  private result2?: TensorMap;

  constructor(
      private http: HttpClient,
      private readonly runResultService: RunResultService,
      private readonly store: Store<AppState>,
  ) {
    // this.store.select(selectRunCurrentConfigsTrigger)
    this.store.select(selectModelGraph(0))
        .pipe(
            filter((trigger) => trigger != null),
            withLatestFrom(
                this.store.select(selectCurrentConfigs),
                this.store.select(selectCurrentInputs),
                this.store.select(selectCurrentConfigs),
                ))
        .subscribe(([
                     modelGraph,
                     curConfigs,
                     curInputs,
                     {config1, config2},
                   ]) => {
          // TODO(jingjin): only support setting tfjs url in config 1.
          if (!modelGraph || !config1.tfjsModelUrl) {
            return;
          }

          console.log(modelGraph);
          this.runConfigs(
              curConfigs, curInputs, modelGraph, config1.tfjsModelUrl);
        });
  }

  fetchModelJson(url: string): Observable<ModelJson> {
    if (url.startsWith('https://tfhub.dev')) {
      url = this.getTFHubUrl(url);
    }
    if (!this.modelJsonCache[url]) {
      // ShareReplay will return the last emitted value, i.e. the response from
      // the http request, without sending the request again.
      this.modelJsonCache[url] =
          this.http.get<ModelJson>(url).pipe(shareReplay(1));
    }
    return this.modelJsonCache[url];
  }

  private runConfigs(
      configs: Configs, inputs: Input[], modelGraph: ModelGraph,
      modelUrl: string) {
    // Generate input values.
    const inputTensorMap1: TensorMap = {};
    const inputTensorMap2: TensorMap = {};
    for (const input of inputs) {
      const values = this.genInputValues(input);

      const values1 = getTypedArrayFromInput(input.dtype, input.shape);
      values1.set(values);
      inputTensorMap1[input.id] = {
        values: values1,
        shape: input.shape,
        dtype: input.dtype,
      };

      const values2 = getTypedArrayFromInput(input.dtype, input.shape);
      values2.set(values);
      inputTensorMap2[input.id] = {
        values: values2,
        shape: input.shape,
        dtype: input.dtype,
      };
    }

    // Send to runners to run two configs with the generated inputs.
    this.finishedRunCount = 0;
    this.result1 = undefined;
    this.result2 = undefined;
    this.runModel(0, configs.config1, inputTensorMap1, modelGraph, modelUrl);
    this.runModel(1, configs.config2, inputTensorMap2, modelGraph, modelUrl);
  }

  private runModel(
      index: number, config: Configuration, inputTensorMap: TensorMap,
      modelGraph: ModelGraph, modelUrl: string) {
    // Create a runner and send necessary data to run the corresponding model,
    // and wait for the result.
    const tfjsModelRunner = new Worker(
        new URL('../workers/tfjs_model_runner.worker', import.meta.url));
    const req: RunTfjsModelRequest = {
      cmd: WorkerCommand.RUN_TFJS_MODEL,
      modelGraph,
      modelUrl,
      config,
      inputs: inputTensorMap,
    };

    tfjsModelRunner.onmessage = ({data}) => {
      const msg = data as WorkerMessage;
      if (msg.cmd === WorkerCommand.RUN_TFJS_MODEL_RESULT) {
        // Save results.
        const outputs = (msg as RunTfjsModelResponse).outputs;
        this.finishedRunCount++;
        if (index === 0) {
          this.result1 = outputs;
        } else if (index === 1) {
          this.result2 = outputs;
        }

        // Update store when all results are sent back from runners.
        if (this.finishedRunCount === 2) {
          this.runResultService.setResultsAndCalculateDiffs(
              this.result1!, this.result2!);
        }

        // Update task status.
        this.store.dispatch(updateRunTaskStatus({
          task: index === 0 ? RunTask.RUN_CONFIG1 : RunTask.RUN_CONFIG2,
          status: TaskStatus.SUCCESS
        }));
      }
    };

    tfjsModelRunner.postMessage(
        req, Object.values(inputTensorMap).map(t => t.values.buffer));
  }

  private genInputValues(input: Input): number[] {
    const size = Math.abs(input.shape.reduce((a, b) => a * b, 1));
    const values: number[] = [];
    switch (input.inputValuesType) {
      case InputValuesType.RANDOM: {
        const min = input.randomMin ?? 0;
        const max = input.randomMax ?? 1;
        for (let i = 0; i < size; i++) {
          values.push(min + Math.random() * (max - min));
        }
        break;
      }
      case InputValuesType.SAME_VALUE: {
        const value = input.sameValue ?? 0;
        for (let i = 0; i < size; i++) {
          values.push(value);
        }
        break;
      }
      default:
        break;
    }
    return values;
  }

  private getTFHubUrl(modelUrl: string): string {
    if (!modelUrl.endsWith('/')) {
      modelUrl = (modelUrl) + '/';
    }
    return `${modelUrl}${DEFAULT_MODEL_NAME}${TFHUB_SEARCH_PARAM}`;
  }
}
