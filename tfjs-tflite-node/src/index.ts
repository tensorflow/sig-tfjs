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

import type {TFLiteWebModelRunner, TFLiteWebModelRunnerOptions, TFLiteWebModelRunnerTensorInfo} from '@tensorflow/tfjs-tflite/dist/types/tflite_web_model_runner';
import {TFHUB_SEARCH_PARAM, TFLiteModel} from './tflite_model';
import * as fs from 'fs';

export * from './delegate_plugin';
import {TFLiteDelegatePlugin} from './delegate_plugin';
import fetch from 'node-fetch';

const addon = require('bindings')('node_tflite_binding');

interface InterpreterOptions {
  threads?: number;
  delegate?: {
    path: string;
    options: [string, string][];
  }
}

export const TFLiteNodeModelRunner = addon.Interpreter as {
  new(model: ArrayBuffer, options: InterpreterOptions): TFLiteWebModelRunner;
};

export const TensorInfo = addon.TensorInfo as {
  new(): TFLiteWebModelRunnerTensorInfo;
};

async function createModel(model: string | ArrayBuffer,
    options?: TFLiteWebModelRunnerOptions
    & {delegates?: TFLiteDelegatePlugin[]}
): Promise<TFLiteWebModelRunner> {
  let modelData: ArrayBuffer;

  if (typeof model === 'string') {
    if (model.slice(0, 4) === 'http') {
      modelData = await (await fetch(model)).arrayBuffer();
    } else {
      modelData = (await fs.promises.readFile(model)).buffer;
    }
  }
  else {
    modelData = model;
  }

  const interpreterOptions: InterpreterOptions = {
    threads: options?.numThreads ?? 4,
  }

  const firstDelegate = options?.delegates?.[0];
  if (options?.delegates?.length > 1) {
    console.warn('Only a single delegate is supported right now. Only the first '
                 + `one, ${firstDelegate.name}, will be used`);
  }
  if (firstDelegate) {
    const delegatePath = firstDelegate.node?.path;
    if (delegatePath) {
      interpreterOptions.delegate = {
        path: delegatePath,
        options: firstDelegate.options,
      }
    }
  }
  return new TFLiteNodeModelRunner(modelData, interpreterOptions);
}

/**
 * Loads a TFLiteModel from the given model url or file.
 *
 * @param model The path to the model (string), or the model content in memory
 *     (ArrayBuffer).
 * @param options Options related to model inference.
 *
 * @doc {heading: 'Models', subheading: 'Loading'}
 */
export async function loadTFLiteModel(
    model: string|ArrayBuffer,
    options?: TFLiteWebModelRunnerOptions
    & {delegates?: TFLiteDelegatePlugin[]}
): Promise<TFLiteModel> {
  // Handle tfhub links.
  if (typeof model === 'string' && model.includes('tfhub.dev') &&
      model.includes('lite-model') && !model.endsWith(TFHUB_SEARCH_PARAM)) {
    model = `${model}${TFHUB_SEARCH_PARAM}`;
  }

  const tfliteModelRunner = await createModel(model, options);
  return new TFLiteModel(tfliteModelRunner);
}
