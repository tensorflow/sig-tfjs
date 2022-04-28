# TFLite Node Codelab

These are the starter files needed for the
[Coral Acceleration for TFLite Node][codelab] codelab.

In this codelab, you'll build an Electron app that classifies images. Your app will

* Classify images from the webcam into the categories defined in the model you've trained.
* Use a Coral accelerator to increase performance, if one is available.
* Use WebNN to increase performance, if it is supported on your platform.

## What you'll learn

* How to install and setup the tensorflow.js npm package to run TFLite models in Node.js.
* How to install the Edge TPU runtime library to run models on a Coral device.
* How to accelerate model inference using a Coral edge TPU.
* How to accelerate model inference with WebNN.

## Getting started

To get started, check out the [codelab instruction][codelab]


## Feedback

This is a work in progress, if you find a mistake, please [file an issue][git-issue].


## License

Copyright 2022 Google, Inc.

Licensed to the Apache Software Foundation (ASF) under one or more contributor
license agreements. See the NOTICE file distributed with this work for
additional information regarding copyright ownership. The ASF licenses this
file to you under the Apache License, Version 2.0 (the “License”); you may not
use this file except in compliance with the License. You may obtain a copy of
the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed
under the License is distributed on an “AS IS” BASIS, WITHOUT WARRANTIES OR
CONDITIONS OF ANY KIND, either express or implied. See the License for the
specific language governing permissions and limitations under the License.


[codelab]: https://codelabs.developers.google.com/tensorflowjs-coral-tflite-node#0
[git-issue]: https://github.com/tensorflow/sig-tfjs/issues/new
