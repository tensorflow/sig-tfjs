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

// The Coral delegate is unusual since it requires the user to have installed
// libedgetpu themselves (due to udev rules for accessing the USB device).
// This means we don't actually ship any DLLs for node. Instead, we load the
// one the user already has installed in their library path.
//
// The following names are from the python implementation.
// https://github.com/google-coral/pycoral/blob/9972f8ec6dbb8b2f46321e8c0d2513e0b6b152ce/pycoral/utils/edgetpu.py#L34-L38
const libNames = new Map<NodeJS.Platform, string>([
  ['linux', 'libedgetpu.so.1'],
  ['darwin', 'libedgetpu.1.dylib'],
  ['win32', 'edgetpu.dll'],
]);

export class CoralDelegate implements TFLiteDelegatePlugin {
  readonly name = 'CoralDelegate';
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
