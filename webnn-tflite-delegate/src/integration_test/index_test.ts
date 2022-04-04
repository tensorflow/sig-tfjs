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

import {WebNNDelegate, WebNNDevice} from '../index';
import {loadTFLiteModel} from 'tfjs-tflite-node';
import type {TFLiteModel} from 'tfjs-tflite-node/dist/tflite_model';
import * as fs from 'fs';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-cpu';
import * as jpeg from 'jpeg-js';

describe('webnn delegate', () => {
  const modelPath = './test_model/mobilenetv2.tflite';
  let model: TFLiteModel;
  let wine: tf.Tensor;
  let labels: string[];

  beforeEach(async () => {
    model = await loadTFLiteModel(modelPath, {
      delegates: [new WebNNDelegate({webnnDevice: WebNNDevice.CPU})],
    });

    // Load the input image of a wine.
    const wineJpeg = jpeg.decode(
      fs.readFileSync('./test_model/wine.jpeg'));

    // Create an RGB array of the wine's pixels (no Alpha channel).
    const {width, height, data} = wineJpeg;
    const wineRGB = new Float32Array(width * height * 3);
    let pixelIndex = 0;
    for (let i = 0; i < width; i++) {
      for (let j = 0; j < height; j++) {
          const valStartIndex = pixelIndex * 4;
          const inputIndex = pixelIndex * 3;
          wineRGB[inputIndex] = (data[valStartIndex] - 127.5) / 127.5;
          wineRGB[inputIndex + 1] = (data[valStartIndex + 1] - 127.5) / 127.5;
          wineRGB[inputIndex + 2] = (data[valStartIndex + 2] - 127.5) / 127.5;
          pixelIndex += 1;
      }
    }

    wine = tf.tensor(wineRGB, [1, 224, 224, 3]);
    labels = fs.readFileSync('./test_model/mobilenetv2_labels.txt', 'utf-8')
      .split(/\r?\n/);
  });

  it('runs a mobilenetv2 model', () => {
    const prediction = model.predict(wine);
    const slice = tf.slice(prediction as tf.Tensor, [0, 1], [-1, 1000]);
    const argmax = tf.argMax(slice, 1);
    const labelIndex = argmax.dataSync()[0];
    const label = labels[labelIndex];
    console.log('label:', label);
    console.log('score: ', slice.dataSync()[labelIndex]);
    expect(label).toEqual('wine bottle');
  });
});
