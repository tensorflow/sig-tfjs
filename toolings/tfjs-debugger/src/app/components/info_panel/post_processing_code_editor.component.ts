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

import {AfterViewInit, Component, ElementRef, Inject, OnDestroy, ViewChild} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {Store} from '@ngrx/store';
import {takeWhile} from 'rxjs';
import {codeMirrorOptions} from 'src/app/common/consts';
import {ExecuteCodeTensor, ExecutePostProcessingCodeRequest, ExecutePostProcessingCodeResponse, PostProcessingResult, WorkerCommand, WorkerMessage} from 'src/app/common/types';
import {selectTfjsReleases} from 'src/app/store/selectors';
import {AppState} from 'src/app/store/state';

export interface PPDialogData {
  code: string;
  tensor1: ExecuteCodeTensor;
  tensor2?: ExecuteCodeTensor;
}

export interface PPDialogResult {
  code: string;
}

const tf = (globalThis as any).tf;

@Component({
  selector: 'post-processing-code-editor',
  templateUrl: 'post_processing_code_editor.component.html',
  styleUrls: ['post_processing_code_editor.component.scss'],
})
export class PostProcessingCodeEditor implements AfterViewInit, OnDestroy {
  @ViewChild('canvas1', {static: false}) canvas1?: ElementRef;
  @ViewChild('canvas2', {static: false}) canvas2?: ElementRef;

  private active = true;
  private latestTfjsRelease = '';
  private codeExecutorWorker1 = new Worker(new URL(
      '../../workers/post_process_code_executor.worker', import.meta.url));
  private codeExecutorWorker2 = new Worker(new URL(
      '../../workers/post_process_code_executor.worker', import.meta.url));
  private curCodeResult?: PostProcessingResult;
  private expectedResultsCount = 0;
  private finishedResultsCount = 0;

  tensor1: ExecuteCodeTensor;
  tensor2?: ExecuteCodeTensor;
  executing = false;
  errorMsg = '';
  output1Type = '';
  output2Type = '';
  output1?: string|ImageData;
  output2?: string|ImageData;

  codeMirrorOptions = codeMirrorOptions;
  codeContent = '';

  constructor(
      public dialogRef: MatDialogRef<PostProcessingCodeEditor>,
      private readonly store: Store<AppState>,
      @Inject(MAT_DIALOG_DATA) public data: PPDialogData,
  ) {
    dialogRef.disableClose = true;
    this.tensor1 = data.tensor1;
    this.tensor2 = data.tensor2;

    this.store.select(selectTfjsReleases)
        .pipe(takeWhile(() => this.active))
        .subscribe(releases => {
          if (!releases) {
            return;
          }
          this.latestTfjsRelease = releases[0]?.version || '4.0.0';
        });

    this.codeExecutorWorker1.onmessage = ({data}) => {
      const msg = data as WorkerMessage;
      if (msg.cmd === WorkerCommand.EXECUTE_POST_PROCESSING_CODE_RESULT) {
        this.handleCodeExecutionResult(
            msg as ExecutePostProcessingCodeResponse);
      }
    };
    this.codeExecutorWorker2.onmessage = ({data}) => {
      const msg = data as WorkerMessage;
      if (msg.cmd === WorkerCommand.EXECUTE_POST_PROCESSING_CODE_RESULT) {
        this.handleCodeExecutionResult(
            msg as ExecutePostProcessingCodeResponse);
      }
    };
  }

  ngAfterViewInit() {
    // TODO(jingjin): use setTimeout to set the code content so that the cursor
    // in the code editor can be placed at the right place.
    setTimeout(() => {
      this.codeContent =
          this.data.code ||
          `// tfjs ${
              this.latestTfjsRelease} has been imported and \`tf\` is ready to use.

//⭐️ The \`tensor\` variable holds the tensor to post-process for.

//👇 Update this function to return a string, or an ImageData (will be rendered
//   in a canvas)
async function main() {
  return 'update me';
}`;
    }, 200);
  }

  ngOnDestroy() {
    this.active = false;
    this.codeExecutorWorker1.terminate();
    this.codeExecutorWorker2.terminate();
  }

  handleDone() {
    const results: PPDialogResult = {
      code: this.codeContent,
    };
    this.dialogRef.close(results);
  }

  handleExecuteCode() {
    // TODO: do tensor2
    this.errorMsg = '';
    this.executing = true;
    this.output1 = undefined;
    this.output2 = undefined;
    this.output1Type = '';
    this.output2Type = '';

    this.expectedResultsCount = this.tensor2 ? 2 : 1;
    this.finishedResultsCount = 0;

    const req1: ExecutePostProcessingCodeRequest = {
      cmd: WorkerCommand.EXECUTE_POST_PROCESSING_CODE,
      latestTfjeRelease: this.latestTfjsRelease,
      code: this.codeContent,
      tensor: this.tensor1,
      index: 0,
    };
    this.codeExecutorWorker1.postMessage(req1);
    if (this.tensor2) {
      const req2: ExecutePostProcessingCodeRequest = {
        cmd: WorkerCommand.EXECUTE_POST_PROCESSING_CODE,
        latestTfjeRelease: this.latestTfjsRelease,
        code: this.codeContent,
        tensor: this.tensor2,
        index: 1,
      };
      this.codeExecutorWorker2.postMessage(req2);
    }
  }

  trackByIndex(index: number, unused: unknown) {
    return index;
  }

  private handleCodeExecutionResult(resp: ExecutePostProcessingCodeResponse) {
    this.finishedResultsCount++;


    // Keep for easier debugging.
    console.log(
        '=======================\n' +
        'result\n=======================\n');
    console.log(resp);

    // TODO: handle canvas.
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
            canvas.width = imageData.width;
            canvas.height = imageData.height;
            const ctx = canvas.getContext('2d');
            ctx?.putImageData(imageData, 0, 0);
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
            canvas.width = imageData.width;
            canvas.height = imageData.height;
            const ctx = canvas.getContext('2d');
            ctx?.putImageData(imageData, 0, 0);
          }
        });
      }
    }

    if (resp.error) {
      this.errorMsg = resp.error;
    }

    if (this.finishedResultsCount === this.expectedResultsCount) {
      this.executing = false;
    }
  }
}
