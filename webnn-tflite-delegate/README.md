# WebNN Delegate for tfjs-tflite-node
The `webnn-tflite-delegate` package adds support for [Web Neural Network API](https://www.w3.org/TR/webnn/) (WebNN API) to tfjs-tflite-node.

## Dependencies

This package takes dependencies on the WebNN API and implementation of [WebNN-native](https://github.com/webmachinelearning/webnn-native). In this package, the WebNN-native uses a specific [commit](https://github.com/webmachinelearning/webnn-native/commit/9d93acffb3eb8fd64d52ba08115de40fcbbd8a0d) and the backend implementation of WebNN-native uses [OpenVINO 2021.4 version](https://docs.openvino.ai/2021.4/get_started.html).

## Installing

Follow the [instructions here](https://docs.openvino.ai/2021.4/get_started.html) to install OpenVINO 2021.4 on [Linux (x64)](https://registrationcenter-download.intel.com/akdlm/irc_nas/18319/l_openvino_toolkit_p_2021.4.752.tgz) or [Windows (x64)](https://registrationcenter-download.intel.com/akdlm/irc_nas/18320/w_openvino_toolkit_p_2021.4.752.exe).


After OpenVINO is installed, you can install the `webnn-tflite-delegate` package with `npm i --save webnn-tflite-delegate`.

## Usage
Register the WebNN delegate while loading a TFLite model in `tfjs-tflite-node` by adding it to the list of delegates in the TFLite options:

```typescript
const model = await loadTFLiteModel('./mobilenetv2.tflite', {
  delegates: [new WebNNDelegate({webnnDevice: WebNNDevice.CPU})],
});

```
Before running model with this package, set following environment variables:

- On Linux, run `./setupvars.sh` to set environment variables for OpenVINO.
- On Windows, run `.\setupvars.bat` to set environment variables for OpenVINO and set the path of dependent WebNN native dll libraries (current location is `./cc_lib/win32_x64/`) to `PATH`.
