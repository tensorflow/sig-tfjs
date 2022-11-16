# TFLite Node Movenet

This is an extension of the starter code from the [Coral Acceleration for TFLite Node][codelab] codelab that adds support for [MoveNet pose estimation](https://coral.ai/models/pose-estimation/). There is no step in the codelab for this code. Its purpose is to show a more complex model.

The demo will display a warning if no Coral device is found, but it will still work using TFLite on CPU instead.

## Running the Demo

Install dependencies
```sh
yarn
```

Start Electron
```sh
yarn start
```

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


[codelab]: https://codelabs.developers.google.com/tensorflowjs-coral-tflite-node
[git-issue]: https://github.com/tensorflow/sig-tfjs/issues/new
