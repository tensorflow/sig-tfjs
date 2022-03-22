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
  // CODELAB part 1: Set up tf.data.webcam here.

  async function run() {
    stats.begin();
    // CODELAB part 1: Capture and preprocess frames here.
    // CODELAB part 1: Run the model and display the results here.
    stats.end();
    requestAnimationFrame(run);
  }

  run();
}

main();
