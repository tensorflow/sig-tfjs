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

import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {Store} from '@ngrx/store';
import {combineLatest, filter, withLatestFrom} from 'rxjs';
import {WorkerCommand, WorkerMessage} from 'src/app/common/types';
import {ModelTypeId} from 'src/app/data_model/model_type';
import {ModelGraph} from 'src/app/data_model/run_results';
import {fetchTfjsModelJson} from 'src/app/store/actions';
import {selectCurrentConfigs, selectModelGraph, selectRunCurrentConfigsTrigger} from 'src/app/store/selectors';
import {AppState, Configs} from 'src/app/store/state';

@Component({
  selector: 'graph-panel',
  templateUrl: './graph_panel.component.html',
  styleUrls: ['./graph_panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GraphPanel implements OnInit {
  /** The model graph that has done the layout.  */
  modelGraph?: ModelGraph;

  private curConfigs?: Configs;

  /** The worker that layouts the model graph. */
  private readonly layoutWorker = new Worker(new URL(
      '../../layout_generator/layout_generator.worker', import.meta.url));

  constructor(
      private readonly store: Store<AppState>,
  ) {}

  ngOnInit() {
    // Fetch model.json file (if the model type is tfjs model) when the "Run"
    // button in the app bar is clicked.
    this.store.select(selectRunCurrentConfigsTrigger)
        .pipe(
            filter(trigger => trigger != null),
            withLatestFrom(this.store.select(selectCurrentConfigs)))
        .subscribe(([unusedTrigger, curConfigs]) => {
          const prevConfigs: Configs|undefined =
              !this.curConfigs ? undefined : {...this.curConfigs};
          this.curConfigs = curConfigs;
          this.fetchModelJsonFilesIfChanged(prevConfigs, this.curConfigs);
        });

    // Send the loaded ModelGraph (converted from model.json) to worker to do
    // layout.
    combineLatest([
      this.store.select(selectModelGraph(0)),
      this.store.select(selectModelGraph(1))
    ]).subscribe(([modelGraph1, modelGraph2]) => {
      if (!this.curConfigs) {
        return;
      }

      // TODO: for now we only handle laying out the TFJS model graph from
      // config1. In the future when we support diffing two model graphs, we
      // will merge those two graphs into one graph and send that graph to the
      // worker for layout.
      if (this.curConfigs.config1.modelType === ModelTypeId.TFJS &&
          this.curConfigs.config2.modelType === ModelTypeId.SAME_AS_CONFIG1 &&
          modelGraph1 != null) {
        const msg: WorkerMessage = {
          cmd: WorkerCommand.LAYOUT,
          configIndex: 0,
          modelGraph: modelGraph1,
        };
        this.layoutWorker.postMessage(msg);
      }
    });

    // Listen to worker's response.
    this.layoutWorker.onmessage = ({data}) => {
      const msg = data as WorkerMessage;
      switch (msg.cmd) {
        case WorkerCommand.LAYOUT_RESULT:
          console.log('got layout result', msg);
          break;

        default:
          break;
      }
    };
  }

  private fetchModelJsonFilesIfChanged(
      prevConfigs: Configs|undefined, curConfigs: Configs) {
    if (!this.curConfigs) {
      return;
    }

    // TODO: for now only handle loading one model.json file from config1 when
    // tfjs model is selected.
    if (this.curConfigs.config1.modelType === ModelTypeId.TFJS &&
        this.curConfigs.config2.modelType === ModelTypeId.SAME_AS_CONFIG1) {
      const urlChanged = !prevConfigs ||
          (prevConfigs.config1.tfjsModelUrl !==
           curConfigs.config1.tfjsModelUrl);
      if (this.curConfigs.config1.tfjsModelUrl && urlChanged) {
        this.store.dispatch(fetchTfjsModelJson(
            {configIndex: 0, url: this.curConfigs.config1.tfjsModelUrl}));
      }
    }
  }
}
