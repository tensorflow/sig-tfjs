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

import {CoralDelegate} from './index';
import {loadTFLiteModel} from '@tensorflow/tfjs-tflite-node'
import {TFLiteModel} from '@tensorflow/tfjs-tflite-node/dist/tflite_model';
import * as fs from 'fs';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-cpu';
import * as jpeg from 'jpeg-js';

describe('coral delegate', () => {
  const modelPath = './test_model/mobilenet_v2_1.0_224_inat_bird_quant_edgetpu.tflite';
  let model: TFLiteModel;
  let parrot: tf.Tensor;
  let labels: string[];

  beforeEach(async () => {
    model = await loadTFLiteModel(modelPath, {
      delegates: [new CoralDelegate([["device", "usb"]])],
    });

    // Load the input image of a parrot.
    const parrotJpeg = jpeg.decode(
      fs.readFileSync('./test_model/parrot-small.jpg'));

    // Create an RGB array of the parrot's pixels (no Alpha channel).
    const {width, height, data} = parrotJpeg;
    const parrotRGB = new Uint8Array(width * height * 3);
    for (let i = 0; i < width * height; i++) {
      const i3 = i * 3;
      const i4 = i * 4;
      parrotRGB[i3] = data[i4];
      parrotRGB[i3 + 1] = data[i4 + 1];
      parrotRGB[i3 + 2] = data[i4 + 2];
    }

    parrot = tf.tensor(parrotRGB, [1, 224, 224, 3]);
    labels = fs.readFileSync('./test_model/inat_bird_labels.txt', 'utf-8')
      .split('\n');
  });

  it('runs a coral model (will fail without coral device)', () => {
    const prediction = model.predict(parrot);
    const argmax = tf.argMax(prediction as tf.Tensor, 1);
    const label = labels[argmax.dataSync()[0]];
    expect(label).toEqual('Ara macao (Scarlet Macaw)');
  });
});
