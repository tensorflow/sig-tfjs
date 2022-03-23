# Coral Delegate for tfjs-tflite-node
The `coral-tflite-delegate` package adds support for [Coral EdgeTPU Accelerators](https://coral.ai/products/accelerator/) to tfjs-tflite-node.

## Installing
This package depends on the [EdgeTPU Runtime Library (libedgetpu)](https://github.com/google-coral/libedgetpu). Follow the [instructions here](https://coral.ai/docs/accelerator/get-started#1-install-the-edge-tpu-runtime) to install it on Linux (x64, arm64), Mac (x64), or Windows (x64). libedgetpu can also be [built from source](https://github.com/google-coral/libedgetpu#building) if binaries are not available for your platform.

After libedgetpu is installed, you can install the `coral-tflite-delegate` package with `npm i --save coral-tflite-delegate`.
