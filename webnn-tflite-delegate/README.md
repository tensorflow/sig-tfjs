# WebNN Delegate for tfjs-tflite-node
The `webnn-tflite-delegate` package adds support for [Web Neural Network API](https://www.w3.org/TR/webnn/) (WebNN API) to tfjs-tflite-node.

## Dependencies

This package takes dependencies on the WebNN API and implementation of [WebNN-native](https://github.com/webmachinelearning/webnn-native). In this package, the WebNN-native uses a specific [commit](https://github.com/webmachinelearning/webnn-native/commit/9d93acffb3eb8fd64d52ba08115de40fcbbd8a0d) and the backend implementation of WebNN-native uses [OpenVINO 2021.4 version](https://docs.openvino.ai/2021.4/get_started.html).

## Installing

Follow the [instructions here](https://docs.openvino.ai/2021.4/get_started.html) to install OpenVINO 2021.4 on Linux (x64) or Windows (x64).

After OpenVINO is installed, you can install the `webnn-tflite-delegate` package with `npm i --save webnn-tflite-delegate`.

## Usage
Register the WebNN delegate while loading a TFLite model in `tfjs-tflite-node` by adding it to the list of delegates in the TFLite options:

```typescript
const model = await loadTFLiteModel('./mobilenetv2.tflite', {
  delegates: [new WebNNDelegate({webnnDevice: WebNNDevice.CPU})],
});

```
Before running model with this package, set following environment variables:

- On Linux, [set environment variables](https://docs.openvino.ai/2021.4/openvino_docs_install_guides_installing_openvino_linux.html#set-the-environment-variables) for OpenVINO.
- On Windows, [set environment variables](https://docs.openvino.ai/2021.4/openvino_docs_install_guides_installing_openvino_windows.html#step-3-configure-the-environment) for OpenVINO and set path of dependent WebNN native dll libraries (current location is `./cc_lib/win32_x64/`) to PATH: `set PATH=%PATH%;<path_to_webnn_native_dll>`.
