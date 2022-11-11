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

import {ExecuteCodeTensor, ExecuteInputsCodeRequest, ExecuteInputsCodeResponse, TensorResults, WorkerCommand, WorkerMessage} from '../common/types';

/// <reference lib="webworker" />

addEventListener('message', async ({data}) => {
  const msg = data as WorkerMessage;
  switch (msg.cmd) {
    case WorkerCommand.EXECUTE_INPUTS_CODE:
      const resp = await executeCode(msg as ExecuteInputsCodeRequest);
      postMessage(resp);
      break;
    default:
      break;
  }
});

async function executeCode(req: ExecuteInputsCodeRequest):
    Promise<ExecuteInputsCodeResponse> {
  // Import tfjs.
  const gt = globalThis as any;
  if (!gt.tf) {
    importScripts(`https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@${
        req.latestTfjeRelease}/dist/tf.js`);
  }
  const tf = gt['tf'];

  // Create tensors from req and put them in globalThis['tensors'].
  gt['tensors'] = {};
  for (const tensor of req.tensors) {
    gt['tensors'][tensor.varName] =
        tf.tensor(tensor.values, tensor.shape, tensor.dtype);
  }

  const codeLines = [
    ...getCommonCode(req.tensors).split('\n'), ...req.code.split('\n'), `
const tensorMap = await main();
const ret = {};
Object.keys(tensorMap).forEach(key => {
  ret[key] = {values: tensorMap[key].dataSync(), dtype: tensorMap[key].dtype};
});
return ret;`
  ];
  /// Keep for easier debugging.
  console.log(
      '=======================\nfinal code\n=======================\n' +
      codeLines.join('\n'));
  let error = '';
  let ret: TensorResults = {};
  try {
    ret = await eval(`(async () => {${codeLines.join('\n')}})()`);
  } catch (e: any) {
    error = e.message;
  }

  return {
    cmd: WorkerCommand.EXECUTE_INPUTS_CODE_RESULT,
    error,
    tensorResults: ret,
  };
}


function getCommonCode(tensors: ExecuteCodeTensor[]) {
  // Get tensor out of globalThis.
  return tensors
             .map(tensor => {
               return `const ${tensor.varName} = globalThis['tensors']['${
                   tensor.varName}']`;
             })
             .join('\n') +
      '\n';
}
