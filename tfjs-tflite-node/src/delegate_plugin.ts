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

// TODO(mattsoulanille): Move this to @tensorflow/tfjs-tflite
/**
 * Represents a TFLite delegate that can be passed as an option to the
 * loadTFLitemodel function.
 * @example
 * // Load the Coral delegate
 * const coralDelegate: TFLiteDelegatePlugin = new CoralDelegate();
 * // Load a model with the delegate registered.
 * const model = loadTFLiteModel('./model.tflite', {
 *   delegates: [coralDelegate],
 * });
 */
export interface TFLiteDelegatePlugin {
  readonly name: string;
  readonly tfliteVersion: string;
  readonly options: Array<[string, string]>;
  readonly node?: {
    path: string;
  };
  readonly browser?: {
    url: string;
  };
}
