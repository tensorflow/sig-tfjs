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

// CODELAB part 1: Import tfjs-tflite-node and @tensorflow/tfjs here.
// CODELAB part 2: Import the delegate here.
const fs = require('fs');
const Stats = require('stats.js');

async function getWebcam() {
  const webcam = document.createElement('video');
  webcam.width = 224;
  webcam.height = 224;
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
  webcam.srcObject = stream;
  webcam.play();
  return webcam;
}

async function main() {
  const stats = new Stats();
  document.body.appendChild(stats.dom);

  const webcam = await getWebcam();
  document.body.appendChild(webcam);

  // For displaying results
  const resultHeader = document.createElement('h1');
  resultHeader.innerHTML = 'Classification: ';
  document.body.appendChild(resultHeader);

  const resultList = document.createElement('ul');
  document.body.appendChild(resultList);

  function showPrediction(data, labels) {
    resultList.innerHTML = ''; // Clear the list
    for (let i = 0; i < data.length; i++) {
      const percent = data[i].toFixed(1);
      const resultText = `${labels[i]}: ${percent}`;
      const result = document.createElement('li');
      result.innerHTML = resultText;
      resultList.appendChild(result);
    }
  }

  // CODELAB part 1: Load the model here.
  // CODELAB part 2: Load the delegate model here.
  // CODELAB part 1: Set up tf.data.webcam here.
  // CODELAB part 2: Create the delegate button here.

  async function run() {
    stats.begin();
    // CODELAB part 1: Capture and preprocess frames here.
    // CODELAB part 2: Check whether to use the delegate here.
    // CODELAB part 1: Run the model and display the results here.
    stats.end();
    requestAnimationFrame(run);
  }

  run();
}

main();
