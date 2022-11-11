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

import {ExecutePostProcessingCodeRequest, ExecutePostProcessingCodeResponse, PostProcessingResult, WorkerCommand, WorkerMessage} from '../common/types';

/// <reference lib="webworker" />

addEventListener('message', async ({data}) => {
  const msg = data as WorkerMessage;
  switch (msg.cmd) {
    case WorkerCommand.EXECUTE_POST_PROCESSING_CODE:
      const resp = await executeCode(msg as ExecutePostProcessingCodeRequest);
      postMessage(resp);
      break;
    default:
      break;
  }
});

async function executeCode(req: ExecutePostProcessingCodeRequest):
    Promise<ExecutePostProcessingCodeResponse> {
  // Import tfjs.
  const gt = globalThis as any;
  if (!gt.tf) {
    importScripts(`https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@${
        req.latestTfjeRelease}/dist/tf.js`);
  }
  const tf = gt['tf'];

  // Create tensor from req and put it in globalThis.
  gt.tensor = tf.tensor(req.tensor.values, req.tensor.shape, req.tensor.dtype);

  const codeLines = [
    'const tensor = globalThis.tensor;', ...req.code.split('\n'),
    'return await main()'
  ];

  // Keep for easier debugging.
  console.log(
      '=======================\nfinal code\n=======================\n' +
      codeLines.join('\n'));
  let error = '';
  let result: PostProcessingResult|undefined = undefined;
  try {
    const ret = await eval(`(async () => {${codeLines.join('\n')}})()`);
    if (typeof ret === 'string') {
      result = {
        type: 'string',
        strResult: ret,
      };
    } else if (ret instanceof ImageData) {
      result = {
        type: 'canvas',
        imageData: ret,
      };
    }
    // TODO: handle ImageData
  } catch (e: any) {
    error = e.message;
  }

  return {
    cmd: WorkerCommand.EXECUTE_POST_PROCESSING_CODE_RESULT,
    error,
    index: req.index,
    result,
  };
}
