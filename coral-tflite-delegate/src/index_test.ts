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

import '@tensorflow/tfjs-backend-cpu';
import {CoralDelegate} from './index';

describe('coral delegate', () => {
  it('has the name "CoralDelegate"', () => {
    expect(new CoralDelegate().name).toEqual('CoralDelegate');
  });

  it('has a TfLite version string', () => {
    expect(new CoralDelegate().tfliteVersion).toBeDefined();
  });

  it('stores options', () => {
    const options: Array<[string, string]> = [['foo', 'bar'], ['123', '456']];
    const coralDelegate = new CoralDelegate(options);
    expect(coralDelegate.options).toEqual(options);
  });

  it('allows manually setting lib path', () => {
    const libPath = 'some lib path';
    const coralDelegate = new CoralDelegate([], libPath);
    expect(coralDelegate.node.path).toEqual(libPath);
  });

  it('sets the lib path automatically based on platorm', () => {
    const coralLinux = new CoralDelegate([], undefined, 'linux');
    const coralMac = new CoralDelegate([], undefined, 'darwin');
    const coralWindows = new CoralDelegate([], undefined, 'win32');

    expect(coralLinux.node.path).toEqual('libedgetpu.so.1');
    expect(coralMac.node.path).toEqual('libedgetpu.1.dylib');
    expect(coralWindows.node.path).toEqual('edgetpu.dll');
  });
});
