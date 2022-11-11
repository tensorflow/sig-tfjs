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

import {AfterViewInit, Component, Inject, OnDestroy} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {Store} from '@ngrx/store';
import {Subject, takeWhile} from 'rxjs';
import {codeMirrorOptions} from 'src/app/common/consts';
import {ExecuteCodeTensor, ExecuteInputsCodeRequest, ExecuteInputsCodeResponse, TensorResults, WorkerCommand, WorkerMessage} from 'src/app/common/types';
import {Input, InputValuesType} from 'src/app/data_model/input';
import {selectTfjsReleases} from 'src/app/store/selectors';
import {AppState} from 'src/app/store/state';

export interface DialogData {
  inputs: Input[];
  code: string;
  uploadedImages: UploadedImage[];
  tensorResultsSubject: Subject<TensorResults|undefined>;
}

export interface DialogResult {
  code: string;
  tensorResults: TensorResults;
  uploadedImages: UploadedImage[];
}

const CHECK_RESULT_PASSED = 'Passed';
const tf = (globalThis as any).tf;

export interface UploadedImage {
  url: string;
  width: number;
  height: number;
  tensor: ExecuteCodeTensor;
}

@Component({
  selector: 'inputs-code-editor',
  templateUrl: 'inputs_code_editor.component.html',
  styleUrls: ['inputs_code_editor.component.scss'],
})
export class InputsCodeEditor implements AfterViewInit, OnDestroy {
  // animal: string;
  // name: string;

  private active = true;
  private latestTfjsRelease = '';
  private codeExecutorWorker = new Worker(
      new URL('../../workers/code_executor.worker', import.meta.url));
  private curTensorResults?: TensorResults;

  inputs!: Input[];
  inputChecks: {[id: string]: string} = {};
  executing = false;
  errorMsg = '';
  curUploadedImages: UploadedImage[] = [];

  codeMirrorOptions = codeMirrorOptions;
  codeContent = '';

  constructor(
      public dialogRef: MatDialogRef<InputsCodeEditor>,
      private readonly store: Store<AppState>,
      @Inject(MAT_DIALOG_DATA) public data: DialogData,
  ) {
    dialogRef.disableClose = true;
    this.inputs = data.inputs;
    this.curUploadedImages = [...data.uploadedImages];

    this.store.select(selectTfjsReleases)
        .pipe(takeWhile(() => this.active))
        .subscribe(releases => {
          if (!releases) {
            return;
          }
          this.latestTfjsRelease = releases[0]?.version || '4.0.0';
        });

    this.codeExecutorWorker.onmessage = ({data}) => {
      const msg = data as WorkerMessage;
      if (msg.cmd === WorkerCommand.EXECUTE_INPUTS_CODE_RESULT) {
        this.handleCodeExecutionResult(msg as ExecuteInputsCodeResponse);
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

//👇 Update this function to return a tensor map.
async function main() {
  // From tensor name to tf.tensor.
  const tensorMap = {};

  // Update as needed.
  ${this.genDefaultTensorMapCode()}

  return tensorMap;
}`;
    }, 200);
  }

  ngOnDestroy() {
    this.active = false;
    this.codeExecutorWorker.terminate();
  }

  handleDone() {
    const results: DialogResult = {
      code: this.codeContent,
      tensorResults: this.curTensorResults || {},
      uploadedImages: this.curUploadedImages,
    };
    this.dialogRef.close(results);
  }

  handleExecuteCode() {
    this.errorMsg = '';
    this.executing = true;
    this.inputChecks = {};
    const req: ExecuteInputsCodeRequest = {
      cmd: WorkerCommand.EXECUTE_INPUTS_CODE,
      latestTfjeRelease: this.latestTfjsRelease,
      code: this.codeContent,
      tensors: this.curUploadedImages.map(image => image.tensor),
    };
    this.codeExecutorWorker.postMessage(req);
  }

  async handleUploadedFilesChanged(e: Event) {
    const ele = e.currentTarget as HTMLInputElement;
    const files = ele.files;
    if (files != null) {
      for (let i = 0; i < files.length; i++) {
        const file = files.item(i);
        if (file) {
          const base64 = await this.fileToBase64(file);
          const image = await this.loadImage(file);
          const tensor = await tf.browser.fromPixels(image);
          const resourceTensor: ExecuteCodeTensor = {
            varName: `img${this.curUploadedImages.length + i}`,
            values: tensor.dataSync(),
            shape: tensor.shape,
            dtype: tensor.dtype
          };
          this.curUploadedImages.push({
            url: base64,
            width: image.width,
            height: image.height,
            tensor: resourceTensor,
          });
        }
      }
    }
    console.log(this.curUploadedImages);
  }

  getInputDTypeAndShape(input: Input) {
    return `${input.dtype} [${input.shape.join(', ')}]`;
  }

  getInputCheckResult(input: Input): string {
    return this.inputChecks[input.id] || '';
  }

  getInputCheckLabel(input: Input): string {
    const checkResult = this.getInputCheckResult(input);
    if (checkResult === '') {
      if (this.executing) {
        return 'Executing';
      } else if (this.errorMsg) {
        return 'Has error';
      } else {
        return 'Click "Execute"';
      }
    }
    return checkResult;
  }

  isInputPassed(input: Input): boolean {
    return this.inputChecks[input.id] === CHECK_RESULT_PASSED;
  }

  trackByIndex(index: number, unused: unknown) {
    return index;
  }

  private genDefaultTensorMapCode() {
    return this.inputs.map(input => {
      let min = input.randomMin || 0;
      let max = input.randomMax || 1;
      if (input.inputValuesType === InputValuesType.SAME_VALUE) {
        min = input.sameValue || 0;
        max = min;
      }
      return `tensorMap['${input.id}'] = tf.randomUniform([${
          input.shape.join(', ')}], ${min}, ${max}, '${input.dtype}');`;
    });
  }

  private handleCodeExecutionResult(resp: ExecuteInputsCodeResponse) {
    // Keep for easier debugging.
    console.log(
        '=======================\n' +
        'result tensor value map\n=======================\n');
    console.log(resp.tensorResults);

    // Check resp.
    if (!resp.error) {
      const tensorResults = resp.tensorResults;
      let allChecksPassed = true;
      for (const input of this.inputs) {
        const size = input.shape.reduce((a, b) => a * b, 1);
        const values = tensorResults[input.id]?.values;
        this.inputChecks[input.id] = CHECK_RESULT_PASSED;
        // Check existence.
        if (!values) {
          this.inputChecks[input.id] = 'Not in map';
          allChecksPassed = false;
        }
        // Check size.
        else if (size !== values.length) {
          this.inputChecks[input.id] =
              `Size not match (expected: ${size}, got ${values.length})`;
          allChecksPassed = false;
        }
        // Check type.
        else if (input.dtype !== tensorResults[input.id].dtype) {
          this.inputChecks[input.id] = `Type not match (expected ${
              input.dtype}, got ${tensorResults[input.id].dtype})`;
          allChecksPassed = false;
        }
      }

      // Close the dialog and send the inputs back if all checks are passed.
      if (allChecksPassed) {
        this.curTensorResults = resp.tensorResults;
      } else {
        this.curTensorResults = undefined;
      }
    } else {
      this.errorMsg = `Error: ${resp.error}`;
      this.curTensorResults = undefined;
    }
    this.data.tensorResultsSubject.next(this.curTensorResults);
    this.executing = false;
  }

  private async fileToBase64(file: File) {
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = (e) => {
        const base64 = e.target?.result as string;
        resolve(base64);
      };
      reader.readAsDataURL(file);
    });
  }

  private async loadImage(file: File) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      const url = URL.createObjectURL(file);
      image.onload = () => {
        resolve(image);
      };
      image.src = url;
    });
  }
}
