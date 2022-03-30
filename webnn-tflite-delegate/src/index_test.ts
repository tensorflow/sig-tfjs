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
import {WebNNDelegate} from './index';
import * as path from 'path';

describe('webnn delegate', () => {
  it('has the name "WebNNDelegate"', () => {
    expect(new WebNNDelegate().name).toEqual('WebNNDelegate');
  });

  it('has a TfLite version string', () => {
  expect(new WebNNDelegate().tfliteVersion).toBeDefined();
  });

  it('stores options', () => {
    const options: Array<[string, string]> = [['foo', 'bar'], ['123', '456']];
    const webnnDelegate = new WebNNDelegate(options);
    expect(webnnDelegate.options).toEqual(options);
  });

  it('allows manually setting lib path', () => {
    const libPath = 'some lib path';
    const webnnDelegate = new WebNNDelegate([], libPath);
    expect(webnnDelegate.node.path).toEqual(libPath);
  });

  it('sets the lib path automatically based on platorm', () => {
    const webnnLinux = new WebNNDelegate([], undefined, 'linux');
    const webnnWindows = new WebNNDelegate([], undefined, 'win32');

    expect(webnnLinux.node.path).toEqual(
      path.join(__dirname, '../cc_lib/linux_x64/webnn_external_delegate_obj.so'));
    expect(webnnWindows.node.path).toEqual(
      path.join(__dirname, '../cc_lib/win32_x64/webnn_external_delegate_obj.dll'));
  });
});
