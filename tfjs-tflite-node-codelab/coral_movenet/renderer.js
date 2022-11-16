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

const {loadTFLiteModel} = require('tfjs-tflite-node');
const tf = require('@tensorflow/tfjs');

const {CoralDelegate} = require('coral-tflite-delegate');
const fs = require('fs');
const Stats = require('stats.js');

const PIXI = require('pixi.js');

tf.setBackend('cpu');

const MODEL_DIMS = {
  width: 256,
  height: 256,
}

const PoseNetEdges = [
  [0, 1], [1, 3], [0, 2], [2, 4],
  [10, 8], [8, 6], [6, 5], [5, 7], [7, 9],
  [6, 12], [5, 11],
  [12, 11],
  [12, 14], [11, 13],
  [14, 16], [13, 15],
];

const OPACITY = 0.8;

async function getWebcam() {
  const webcam = document.createElement('video');
  webcam.width = MODEL_DIMS.width;
  webcam.height = MODEL_DIMS.height;
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
        mandatory: {
          minHeight: webcam.height,
          minWidth: webcam.width,
          maxHeight: webcam.height,
          maxWidth: webcam.width,
        }
    }
  });
  // Flip the image so the video looks like a mirror.
  webcam.style.transform = 'scaleX(-1)';
  // Allow overlaying pixi
  webcam.style.gridArea = '1 / 1 / 2 / 2';
  webcam.style.zIndex = '-1';
  webcam.srcObject = stream;
  webcam.play();
  return webcam;
}

async function main() {
  const stats = new Stats();
  document.body.appendChild(stats.dom);

  const webcam = await getWebcam();
  const videoDiv = document.createElement('div');
  videoDiv.style.display = 'grid';
  document.body.appendChild(videoDiv)
  videoDiv.appendChild(webcam);

  const resultList = document.createElement('ul');
  document.body.appendChild(resultList);

  const app = new PIXI.Application({
    ...MODEL_DIMS,
    backgroundAlpha: 0,
  });
  const graphics = new PIXI.Graphics();
  app.stage.addChild(graphics);
  app.view.style.gridArea = '1 / 1 / 2 / 2';
  videoDiv.appendChild(app.view);
  
  function showPrediction(data) {
    const array = data.dataSync();
    if (array.length / 3 !== 17) {
      const err = `Unexpected array length ${array.length} / 3 !== 17`;
      resultList.innerHTML = err;
      throw new Error(err);
    }

    // Turn into 3d points
    const points3d = [];
    for (let i = 0; i < array.length; i += 3) {
      points3d.push([array[i], array[i + 1], array[i + 2]]);
    }
    
    // Project onto the image
    const points = points3d.map(p => [
      MODEL_DIMS.width - p[1] * MODEL_DIMS.width,
      p[0] * MODEL_DIMS.height,
      p[2],
    ]);

    const threshold = 0.25;

    // Clear the last frame
    graphics.clear();

    // Draw edges
    graphics.lineStyle(3, 0x00ff00, OPACITY);
    for (const edge of PoseNetEdges) {
      const a = points[edge[0]];
      if (a[2] < threshold) {
        continue;
      }

      const b = points[edge[1]];
      if (b[2] < threshold) {
        continue;
      }

      graphics.moveTo(a[0], a[1]);
      graphics.lineTo(b[0], b[1]);
    }

    // Draw a circle on each point
    graphics.lineStyle(3, 0xff0000, OPACITY);
    for (const point of points) {
      if (point[2] < threshold) {
        continue;
      }
      graphics.drawCircle(point[0], point[1], 1);
    }
  }

  const modelPath = './models/movenet_single_pose_thunder_ptq.tflite';
  const model = await loadTFLiteModel(modelPath);

  const coralModelPath = './models/movenet_single_pose_thunder_ptq_edgetpu.tflite';
  const options = {delegates: [new CoralDelegate()]};
  let coralModel;
  try {
    coralModel = await loadTFLiteModel(coralModelPath, options);
  } catch (e) {
    alert('Could not create coral model due to the following error:\n\n' + e.message);
  }

  const tensorCam = await tf.data.webcam(webcam);

  let useCoralDelegate = true;
  const toggleCoralButton = document.createElement('button');
  function toggleCoral() {
    // If switching to coral, check if coral works.
    if (!coralModel && !useCoralDelegate) {
      alert('Coral model failed to load. See error when opening the app');
      return;
    }
    useCoralDelegate = !useCoralDelegate;
    toggleCoralButton.innerHTML = useCoralDelegate
        ? 'Using Coral. Press to switch to CPU.'
        : 'Using CPU. Press to switch to Coral.';
  }
  toggleCoralButton.addEventListener('click', toggleCoral);
  toggleCoral();
  document.body.appendChild(toggleCoralButton);

  async function run() {
    const image = await tensorCam.capture();
    tf.tidy(() => {
      const cast = tf.cast(image, 'int32');
      const expanded = tf.expandDims(cast, 0);
      let prediction;
      if (useCoralDelegate) {
        stats.begin();
        prediction = coralModel.predict(expanded);
        stats.end();
      } else {
        stats.begin();
        prediction = model.predict(expanded);
        stats.end();
      }
      showPrediction(prediction);
    });
    image.dispose();
    requestAnimationFrame(run);
  }

  run();
}

main();
