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

import {ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {Store} from '@ngrx/store';
import {combineLatest, takeWhile} from 'rxjs';
import {ExecutePostProcessingCodeRequest, ExecutePostProcessingCodeResponse, UrlParamKey, WorkerCommand, WorkerMessage} from 'src/app/common/types';
import {calculateRelativeDiff, getPctDiffString} from 'src/app/common/utils';
import {TfjsRelease} from 'src/app/data_model/tfjs_release';
import {setNodeIdToLocate} from 'src/app/store/actions';
import {selectBadNodesThreshold, selectConfigValueFromUrl, selectTfjsReleases} from 'src/app/store/selectors';
import {AppState} from 'src/app/store/state';

import {PostProcessingCodeEditor, PPDialogData, PPDialogResult} from './post_processing_code_editor.component';
import {NodeInfo, Value} from './types';

@Component({
  selector: 'node-info-panel',
  templateUrl: './node_info_panel.component.html',
  styleUrls: ['./node_info_panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NodeInfoPanel implements OnInit, OnDestroy {
  @Input() nodeInfo?: NodeInfo;
  @ViewChild('canvas1', {static: false}) canvas1?: ElementRef;
  @ViewChild('canvas2', {static: false}) canvas2?: ElementRef;

  private active = true;
  private thresholdPct = -1;
  private curTfjsModelUrl = '';
  private tfjsReleases: TfjsRelease[] = [];
  private codeExecutorWorker1 = new Worker(new URL(
      '../../workers/post_process_code_executor.worker', import.meta.url));
  private codeExecutorWorker2 = new Worker(new URL(
      '../../workers/post_process_code_executor.worker', import.meta.url));

  curPostProcessingCode = '';
  output1Type = '';
  output2Type = '';
  output1?: string|ImageData;
  output2?: string|ImageData;

  constructor(
      private readonly changeDetectionRef: ChangeDetectorRef,
      private readonly store: Store<AppState>,
      public dialog: MatDialog,
  ) {}

  ngOnInit() {
    this.store.select(selectBadNodesThreshold)
        .pipe(takeWhile(() => this.active))
        .subscribe(thresholdPct => {
          this.thresholdPct = thresholdPct;
          this.changeDetectionRef.markForCheck();
        });

    combineLatest([
      this.store.select(
          selectConfigValueFromUrl(0, UrlParamKey.TFJS_MODEL_URL)),
      this.store.select(selectTfjsReleases),
    ])
        .pipe(takeWhile(() => this.active))
        .subscribe(([url, releases]) => {
          if (!url || !releases || releases.length === 0) {
            return;
          }
          this.curTfjsModelUrl = url;
          this.tfjsReleases = releases;
          this.loadAndRunPostProcessingCode();
        });

    this.codeExecutorWorker1.onmessage = ({data}) => {
      if (!this.active) {
        return;
      }
      const msg = data as WorkerMessage;
      if (msg.cmd === WorkerCommand.EXECUTE_POST_PROCESSING_CODE_RESULT) {
        this.handleCodeExecutionResult(
            msg as ExecutePostProcessingCodeResponse);
      }
    };
    this.codeExecutorWorker2.onmessage = ({data}) => {
      if (!this.active) {
        return;
      }
      const msg = data as WorkerMessage;
      if (msg.cmd === WorkerCommand.EXECUTE_POST_PROCESSING_CODE_RESULT) {
        this.handleCodeExecutionResult(
            msg as ExecutePostProcessingCodeResponse);
      }
    };
  }

  ngOnDestroy() {
    this.active = false;
  }

  handleClickLocateNode() {
    if (!this.nodeInfo) {
      return;
    }

    this.store.dispatch(setNodeIdToLocate({nodeId: this.nodeInfo.id}));
  }

  isNodeBad() {
    if (!this.nodeInfo) {
      return false;
    }
    return Math.abs((this.nodeInfo.diffValue || 0)) > this.thresholdPct / 100;
  }

  showValues() {
    if (!this.nodeInfo) {
      return false;
    }

    return this.nodeInfo.values != null;
  }

  getDiff(v: Value): string {
    const diff = calculateRelativeDiff(v.v1 - v.v2, v.v2);
    return getPctDiffString(diff);
  }

  isDiffBad(v: Value): boolean {
    let diff = (v.v1 - v.v2) / v.v2;
    if (v.v2 === 0) {
      diff = v.v1 === 0 ? 0 : Infinity;
    }
    return Math.abs(diff) >= this.thresholdPct / 100;
  }

  attrsCount(): number {
    if (!this.nodeInfo) {
      return 0;
    }
    return this.nodeInfo.attrs.length;
  }

  handleClickOpenPostProcessingCodeEditor() {
    if (!this.nodeInfo) {
      return;
    }

    const data: PPDialogData = {
      code: this.curPostProcessingCode,
      tensor1: {
        varName: '',
        values: this.nodeInfo.rawValues1!,
        shape: this.nodeInfo.shape,
        dtype: this.nodeInfo.dtype,
      },
    };
    if (this.nodeInfo.rawValues2) {
      data.tensor2 = {
        varName: '',
        values: this.nodeInfo.rawValues2,
        shape: this.nodeInfo.shape,
        dtype: this.nodeInfo.dtype,
      };
    }
    const dialogRef = this.dialog.open(PostProcessingCodeEditor, {
      width: '787px',
      data,
    });

    dialogRef.afterClosed().subscribe((result: PPDialogResult) => {
      this.curPostProcessingCode = result.code;
      localStorage.setItem(
          this.genPostProcessingCodeKey(), this.curPostProcessingCode);
      this.loadAndRunPostProcessingCode();
    });
  }

  private handleCodeExecutionResult(resp: ExecutePostProcessingCodeResponse) {
    if (resp.index === 0) {
      this.output1Type = resp.result?.type || '';
      if (this.output1Type === 'string') {
        this.output1 = resp.result?.strResult;
      } else if (this.output1Type === 'canvas') {
        this.output1 = resp.result?.imageData;
        setTimeout(() => {
          if (this.canvas1 && this.output1) {
            const canvas = this.canvas1.nativeElement as HTMLCanvasElement;
            const imageData = this.output1 as ImageData;
            this.renderImageDataOnCanvas(imageData, canvas);
          }
        });
      }
    }
    if (resp.index === 1) {
      this.output2Type = resp.result?.type || '';
      if (this.output2Type === 'string') {
        this.output2 = resp.result?.strResult;
      } else if (this.output2Type === 'canvas') {
        this.output2 = resp.result?.imageData;
        setTimeout(() => {
          if (this.canvas2 && this.output2) {
            const canvas = this.canvas2.nativeElement as HTMLCanvasElement;
            const imageData = this.output2 as ImageData;
            this.renderImageDataOnCanvas(imageData, canvas);
          }
        });
      }
    }
    this.changeDetectionRef.markForCheck();
  }

  private renderImageDataOnCanvas(
      imageData: ImageData, canvas: HTMLCanvasElement) {
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    ctx?.putImageData(imageData, 0, 0);
  }

  private loadAndRunPostProcessingCode() {
    this.curPostProcessingCode =
        localStorage.getItem(this.genPostProcessingCodeKey()) || '';
    if (!this.curPostProcessingCode) {
      return;
    }

    this.output1 = undefined;
    this.output2 = undefined;
    this.output1Type = 'executing';
    this.output2Type = 'executing';
    this.changeDetectionRef.markForCheck();

    const req1: ExecutePostProcessingCodeRequest = {
      cmd: WorkerCommand.EXECUTE_POST_PROCESSING_CODE,
      latestTfjeRelease: this.tfjsReleases[0].version,
      code: this.curPostProcessingCode,
      tensor: {
        varName: '',
        values: this.nodeInfo!.rawValues1!,
        shape: this.nodeInfo!.shape,
        dtype: this.nodeInfo!.dtype,
      },
      index: 0,
    };
    this.codeExecutorWorker1.postMessage(req1);

    if (this.nodeInfo?.rawValues2) {
      const req2: ExecutePostProcessingCodeRequest = {
        cmd: WorkerCommand.EXECUTE_POST_PROCESSING_CODE,
        latestTfjeRelease: this.tfjsReleases[0].version,
        code: this.curPostProcessingCode,
        tensor: {
          varName: '',
          values: this.nodeInfo.rawValues2,
          shape: this.nodeInfo.shape,
          dtype: this.nodeInfo.dtype,
        },
        index: 1,
      };
      this.codeExecutorWorker2.postMessage(req2);
    }
  }

  private genPostProcessingCodeKey() {
    return `${this.curTfjsModelUrl}_${this.nodeInfo!.id}_post_processing_code`;
  }
}
