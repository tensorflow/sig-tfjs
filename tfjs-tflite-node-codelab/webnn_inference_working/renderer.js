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

// CODELAB part 1: Import tfjs-tflite-node here.
const {loadTFLiteModel} = require('tfjs-tflite-node');
const tf = require('@tensorflow/tfjs');
// CODELAB part 2: Import the delegate here.
const {WebNNDelegate, WebNNDevice} = require('webnn-tflite-delegate');
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
  const modelPath = './model/model_unquant.tflite';
  const cpuModel = await loadTFLiteModel(modelPath);
  const labels = fs.readFileSync('./model/labels.txt', 'utf8')
        .split(/\r?\n/);

  // CODELAB part 2: Load the delegate model here.
  let webnnModel = await loadTFLiteModel(modelPath, {
    delegates: [new WebNNDelegate({webnnDevice: WebNNDevice.DEFAULT})],
  });

  // CODELAB part 1: Set up tf.data.webcam here.
  const tensorCam = await tf.data.webcam(webcam);

  // CODELAB part 2: Create the delegate button here.
  let useWebNNDelegate = false;

  // Create elements for WebNN device selection
  const divElem = document.createElement('div');
  divElem.innerHTML = '<br/>WebNN Device: ';
  const selectElem = document.createElement('select');
  divElem.appendChild(selectElem);

  const webnnDevices = ['Default', 'GPU', 'CPU'];
  // append the options
  for (let i = 0; i < webnnDevices.length; i++) {
    var optionElem = document.createElement('option');
    optionElem.value = i;
    optionElem.text = webnnDevices[i];
    selectElem.appendChild(optionElem);
  }
  selectElem.addEventListener('change', async () => {
    let webnnDevice;
    switch(selectElem.value) {
      case '1':
        webnnDevice = WebNNDevice.GPU;
        break;
      case '2':
        webnnDevice = WebNNDevice.CPU;
        break;
      default:
        webnnDevice = WebNNDevice.DEFAULT;
        break;
    }
    webnnModel = await loadTFLiteModel(modelPath, {
      delegates: [new WebNNDelegate({webnnDevice})],
    });
  });

  const toggleWebNNButton = document.createElement('button');
  function toggleWebNN() {
    useWebNNDelegate = !useWebNNDelegate;
    toggleWebNNButton.innerHTML = useWebNNDelegate
        ? 'Using WebNN. Press to switch to TFLite CPU.'
        : 'Using TFLite CPU. Press to switch to WebNN.';
    divElem.hidden = useWebNNDelegate ? false : true;
  }

  toggleWebNNButton.addEventListener('click', toggleWebNN);
  toggleWebNN();
  document.body.appendChild(toggleWebNNButton);
  document.body.appendChild(divElem);

  async function run() {
    // CODELAB part 1: Capture webcam frames here.
    const image = await tensorCam.capture();
    tf.tidy(() => {
      // CODELAB part 1: Preprocess webcam frames here.
      const expanded = tf.expandDims(image, 0);
      // CODELAB part 2: Check whether to use the delegate here.
      let model;
      if (useWebNNDelegate) {
        model = webnnModel;
      } else {
        model = cpuModel;
      }
      const divided = tf.div(expanded, tf.scalar(127));
      const normalized = tf.sub(divided, tf.scalar(1));

      // CODELAB part 1: Run the model and display the results here.
      stats.begin();
      const prediction = model.predict(normalized);
      stats.end();
      const percentage = tf.mul(prediction, tf.scalar(100));
      showPrediction(percentage.dataSync(), labels);
    });
    // CODELAB part 1: Dispose webcam frames here.
    image.dispose();
    requestAnimationFrame(run);
  }

  run();
}

main();
