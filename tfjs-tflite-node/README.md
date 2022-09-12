# TFLite support for Tensorflow.js Node
WORK IN PROGRESS

This package enables users to run arbitrary TFLite models in Node.js. To load packages on the web, use [@tensorflow/tfjs-tflite](https://github.com/tensorflow/tfjs/tree/master/tfjs-tflite). Users can load a TFLite model from a URL, use TFJS tensors to set the model's input data, run inference, and get the output back in TFJS tensors. Under the hood, the TFLite C++ runtime is packaged into a library and made available via node-api bindings. 

# Usage
## Import the packages
To use this package, you will need a TFJS backend installed (in order to pass tensors to and from the library). We recommend the [CPU backend](https://github.com/tensorflow/tfjs/tree/master/tfjs-backend-cpu), unless you need to do a lot of preprocessing, in which case you may want to use the [Node.js backend](https://github.com/tensorflow/tfjs/tree/master/tfjs-node).

```
// Adds the CPU backend.
import '@tensorflow/tfjs-backend-cpu';
// Import @tensorflow/tfjs-core
import * as tf from '@tensorflow/tfjs-core';
// Import @tensorflow/tfjs-tflite.
import * as tflite from 'tfjs-tflite-node';
```

## Load a TFLite model
```
const tfliteModel = await tflite.loadTFLiteModel('url/to/your/model.tflite');
```

## Run inference
```
// Prepare input tensors.
const img = tf.node.decodeJpeg(new Uint8Array(fs.readFileSync('img.jpg')));
const input = tf.sub(tf.div(tf.expandDims(img), 127.5), 1);

// Run inference and get output tensors.
let outputTensor = tfliteModel.predict(input) as tf.Tensor;
console.log(outputTensor.dataSync());
```
Or take a look at the [end-to-end example](https://github.com/tensorflow/sig-tfjs/tree/main/tfjs-tflite-node-codelab/cpu_inference_working).

## Add a delegate
tfjs-tflite-node supports TFLite delegates that have been packaged for npm.

```
import * as tflite from 'tfjs-tflite-node';
import {CoralDelegate} from 'coral-tflite-delegate';

const tfliteModel = await tflite.loadTFLiteModel('url/to/your/model.tflite', {
  delegates: [new CoralDelegate()],
});
```
Take a look at the [end-to-end Coral demo](https://github.com/tensorflow/sig-tfjs/tree/main/tfjs-tflite-node-codelab/coral_inference_working) for a more complete example.

# Performance
This package uses [XNNPACK](https://github.com/google/XNNPACK) to accelerate inference for floating-point and quantized models. See [XNNPACK documentation](https://github.com/tensorflow/tensorflow/blob/master/tensorflow/lite/delegates/xnnpack/README.md#limitations-and-supported-operators) for the full list of supported floating-point and quantized operators.supported floating-point and quantized operators.

By default, the runtime uses 4 threads, but this can be configured.
```
const tfliteModel = await tflite.loadTFLiteModel('url/to/your/model.tflite', {
  threads: 16,
});
```

# Profiling
`@tensorflow/tfjs-tflite` supports profiling, but tfjs-tflite-node does not support profiling yet.

# Development
## Building
```
yarn
yarn build
```
## Testing
```
yarn test
```
Or to avoid re-building,
```
yarn test-dev
```
## Deployment
```
yarn build
npm publish
```
# Supported Platforms
For a full list of supported platforms, see the [cc_deps](cc_deps/) directory.
