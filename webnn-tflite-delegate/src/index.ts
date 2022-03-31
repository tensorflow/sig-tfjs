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

import type {TFLiteDelegatePlugin} from 'tfjs-tflite-node';
import * as os from 'os';
import * as path from 'path';

const libNames = new Map<NodeJS.Platform, string>([
  ['linux', path.join(__dirname, '../cc_lib/linux_x64/webnn_external_delegate_obj.so')],
  ['win32', path.join(__dirname, '../cc_lib/win32_x64/webnn_external_delegate_obj.dll')],
]);

export class WebNNDelegate implements TFLiteDelegatePlugin {
  readonly name = 'WebNNDelegate';
  readonly tfliteVersion = '2.7';
  readonly node: TFLiteDelegatePlugin['node'];

  constructor(readonly options: Array<[string, string]> = [],
              libPath?: string, platform = os.platform()) {
    if (!libPath) {
      libPath = libNames.get(platform);
      if (!libPath) {
        throw new Error(`Unknown platform ${platform}`);
      }
    }

    this.node = {
      path: libPath,
    };
  }
}
