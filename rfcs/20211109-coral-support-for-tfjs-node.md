# Coral Support for TFJS Node

| Status        | Proposed       |
:-------------- |:---------------------------------------------------- |
| **RFC #**     | [NNN](https://github.com/tfjs-sig/pull/NNN) (update when you have community PR #)|
| **Author(s)** | Matthew Soulanille (msoulanille@google.com), Jason Mayes (jmayes@google.com) |
| **Sponsor**   | A N Expert (whomever@tensorflow.org)                 |
| **Updated**   | 2021-11-16                                          |


## Objective

Enable TensorFlow.js to run tflite models in Node and support accelerating those models with a Coral accelerator in a standardized manner agnostic to the form factor of the Coral device.

Currently the Coral device is available in multiple form factors:

1. As a [standalone USB dongle](https://coral.ai/products/accelerator/) that can be plugged into an edge device such as a Raspberry Pi. This will be the primary device form factor to support.
2. Directly integrated onboard with the developer kit such as the [Tinker Edge T](https://tinker-board.asus.com/product/tinker-edge-t.html).
3. Via PCIe interface such as [this offering from Asus](https://iot.asus.com/products/AI-accelerator/AI-Accelerator-PCIe-Card/).

If the Linux driver (libedgetpu.so) provides access to all form factors, then an interface to this driver from Node should be provided via TensorFlow.js APIs such that the user can specify the correct interface and send arbitary TFLite models to the Coral accelerator for ML inference.

As TensorFlow.js models in the model.json format can not be executed on the Coral accelerators directly, we will only support the loading of TFLite models via our API to be deployed to Coral accelerators. Conversion of TensorFlow.js models to this format required by the Coral device is outside of scope of this proposal but could be investigated if large enough demand in the future.


## Motivation

The TensorFlow.js team has received a number of requests (~20% of responses in our developer survey) that mentioned a desire for Coral support on edge devices such as the Raspberry Pi to acheive faster inference speeds when working with TensorFlow.js on such devices. In fact, for some users, not having Coral support was the main reason they could not work with TensorFlow.js as only Python bindings were available. There are a number of users making custom physical experiences that can benefit from such acceleration while still using the tech stacks they love, such as this user's feedback:

"It would be wonderful to have Coral support for TFJS so it's not a 2nd class citizen - It's a bit of a deal-breaker for some of our projects, and recently we purchased about 800+ ARM devices with GPU's for a IoT project when we would have rather used something such as the Coral dev board, however Node support is important as most of our IoT stack is in docker containers managed via Balena.io"

[After further investingation](https://github.com/tensorflow/tfjs/issues/1422#issuecomment-949049456), supporting Coral accelerators via WebUSB in the browser is currently not feasible due to OS level constraints around USB refresh after uploading firmware to the device each time it is plugged in. Currently this is best handled via a program that can interface with drivers at the OS Level such as Node.js vs the web browser itself. 

Furthrmore after speaking with potential users of such a system, the primary use case is to accelerate edge devices like the Raspberry Pi or Asus Tinker Edge T, as most laptops/desktops or current generation smart phones that execute TensorFlow.js in browser already have real time performance with many of our models and users are satisfied with performance on these higher end devices.


TODO: REMOVE THESE NOTES LATER:
Why this is a valuable problem to solve? What background information is needed
to show how this design addresses the problem?
Which users are affected by the problem? Why is it a problem? What data supports
this? What related work exists?

## User Benefit

By supporting Coral accelerators for edge devices in Node, this will address:

1. User needs for high performance inference, on low power devices such as Raspberry PIs.
2. Enabling users to use the tech stacks they love or already use - namely Node.js - for which [over 50% of developers use as their framework of choice](https://insights.stackoverflow.com/survey/2020#technology-other-frameworks-libraries-and-tools-professional-developers3). 
3. Allowing users to stick within the TensorFlow.js ecocystem across the stack.
4. TFLite users who will be able to deploy their models via TensorFlow.js in Node instead of Python giving users a wider array of options for deployment based on their team's skills and preferences. 

Furthermore the [JIT compiler of JavaScript has proven to be faster than Python for ML usecases](https://blog.tensorflow.org/2020/05/how-hugging-face-achieved-2x-performance-boost-question-answering.html) for pre/post processing acceleration. Given the low powered nature of these edge devices, using a language that can run faster for this part of the ML pipeline outside of the inference itself, could be the difference between runing in realtime vs not on such a device.

TODO: REMOVE THESE NOTES LATER:
How will users (or other contributors) benefit from this work? What would be the
headline in the release notes or blog post?

## Demo Repository
[This demo](https://github.com/mattsoulanille/node-tflite) is forked from [an external project that adds tflite support to node](https://github.com/seanchas116/node-tflite). The demo adds Coral support thorugh an [argument to the existing Napi bindings](https://github.com/mattsoulanille/node-tflite/blob/master/index.cc#L126-L138) and [links](https://github.com/mattsoulanille/node-tflite/blob/master/binding.gyp#L17) the [libedgetpu library](https://github.com/google-coral/libedgetpu) that is required for interacting with Coral devices.

The demo has been tested on Linux X86 devices but has not been fully configured for Windows or Mac. It has also only been tested with a USB Coral device, although it should work with a PCIe device as well since it relies on libedgetpu for Coral support. To run the demo yourself, follow these steps:
1. [Install the Edge TPU runtime](https://coral.ai/docs/accelerator/get-started#1-install-the-edge-tpu-runtime).
2. In the root of the repository, install dependencies and compile the Napi bindings with `npm install`.
3. In the `examples/electron-mediapipe-face` repository, run `npm install` to install dependencies.
4. Run `npm start` to start the demo. You should see a screen like this:



## Design Proposal

### Overview
We propose:
1. To extend `tfjs-tflite` or `tfjs-node` to support running TFLite models in Node, or to write a new package that supports running tflite models in node.
2. To provide a plugin system for TFLite Delegates and a Coral plugin that provides support for Coral accelerators.

We exclude from the scope of this proposal:
1. Coral support for web - This is of limited use for Coral devices, [which must be plugged in, unplugged, and plugged in again to work on the web](https://github.com/google-coral/webcoral#device-setup).
2. Plugin support for web - This may be a future proposal.

### High Level Constraints and Tradeoffs
1. Package size - Constrained more than usual for an npm package since a target platform is IoT devices.
2. Supported platforms vs Maintainability - TFLite does not ship precompiled binaries, and [Coral ships a limited set of precompiled binaries](https://github.com/google-coral/libedgetpu/releases/tag/release-grouper). We need to balance supported platforms with maintenance cost to the team. Ideally, we would let users compile TFLite and libedgetpu themselves for unsupported platforms.
3. Where to implement the proposal - In tfjs-node? In tfjs-tflite? In a new package?
4. Whether to use the [TFLite C api](https://github.com/tensorflow/tensorflow/blob/master/tensorflow/lite/c/c_api.h) or the [C++ api](https://github.com/tensorflow/tensorflow/blob/master/tensorflow/lite/BUILD#L343-L370). The demo uses the C api, but tfjs-tflite uses the C++ api. The APIs are nearly functionally equivalent. The C library is 2.9MB while the C++ library is 3.4MB.

### Where to Implement

#### In tfjs-node
This section is TODO pending discussion. See question at the bottom of the doc.

### Running TFLite Models in Node
TFLite provides a C API and a C++ API for running models. The [C API aims to be more simple than the C++ API](https://github.com/tensorflow/tensorflow/blob/master/tensorflow/lite/c/c_api.h#L27-L31), and this is what the demo uses. The C++ API is what `tfjs-tflite` currently uses. As much as possible, we would like to provide the same interface for tflite in Node and on the web, so using the C++ API, while not strictly necessary, will likely make this easier. 

Unlike the WASM bundle, which is distributed as a precompiled binary, support for Node will be provided by Napi bindings to a precompiled tflite library.  TODO: Explain node gyp process

### Plugin System for Delegates
Coral support and support for other accelerators will be shipped as plugins separately from the main tflite package, likely in separate npm packages. At runtime, the main tflite library will [dynamically load](https://en.wikipedia.org/wiki/Dynamic_loading#Uses) plugins specified by the user. Each of these plugins implements the TFLiteDelegatePlugin interface defined below (TODO). This approach, as opposed to a monolithic tflite entrypoint that includes all the accelerators / delegates, will allow us (and external contributors) to grow the list of supported delegates without impacting library size or requiring review from the TFJS team. This is similar to how delegates are loaded in Python, which is done via the [`tf.lite.experimental.load_delegate`](https://www.tensorflow.org/lite/api_docs/python/tf/lite/experimental/load_delegate) function. This function is [used in the PyCoral library](https://github.com/google-coral/pycoral/blob/master/pycoral/utils/edgetpu.py#L52) to load the Coral accelerator as a delegate, and it uses [`ctypes.pydll.LoadLibrary`](https://github.com/tensorflow/tensorflow/blob/v2.7.0/tensorflow/lite/python/interpreter.py#L90) under the hood. Perhaps [`node-ffi`](https://github.com/node-ffi/node-ffi) can help with this?

TODO(mattsoulanile): Figure out if this is possible and implement it in the demo.

```typescript
interface TFLiteDelegate<SerializedOptions> {
  name: string; // Name of the delegate. We could remove this if we don't think it's needed.
  path(platform?: string): string; // Returns the path to the delegate dll based on the platform.
  serializedOptions: SerializedOptions // https://github.com/tensorflow/tensorflow/blob/v2.7.0/tensorflow/lite/python/interpreter.py#L98-L104
}
```
#### Package Format
The package format for a delegate plugin is likely simpler than the main TFLite package. A plugin might not even need to use node-gyp to compile bindings. Instead, it would provide precompiled binaries of its delegate for supported platforms (see esbuild's npm pakcage setup for how to download only the one compatible with the current platform). It would also provide a js entrypoint that just declares the path to the dll and the type for the dll's options (and a function to serialize those options). 

### Preparing the Model for Coral
Coral is not a typical TFLite delegate. It does not directly support running any TFLite ops. Instead, [it relies on a (closed source) compiler](https://coral.ai/docs/edgetpu/compiler/#download) which replaces all the ops of a network with a single custom op that runs on the Edge TPU. Here's what this looks like for Mediapipe's face detection model: (TODO(mattsoulanille): Add pictures)

<table>
    <tr>
        <td>Coral</td>
        <td>Native TFLite</td>
    </tr>
    <tr>
        <td>
            <img src="20211109-coral-support-for-tfjs-node/mediapipe-face-coral.png">
        </td>
        <td>
            <img src="20211109-coral-support-for-tfjs-node/mediapipe-face.png">
        </td>
    </tr>
</table>

The compiler is a separate program, and it must be applied to the model before it is loaded into TFLite. It also requires that all the ops in the model be quantized to uint8, since Coral only has uint8 hardware. For optimal inference quality, this may require retraining the model after quantizing to uint8, and it's not something that can be easily done automatically to an arbitrary model. For these reasons, the proposal will likely _not_ attempt to automatically convert TFLite models to a format compatible with Coral.

### Connecting 

### Alternatives Considered
* Make sure to discuss the relative merits of alternatives to your proposal.

### Performance Implications
* Do you expect any (speed / memory)? How will you confirm?
* There should be end-to-end tests and benchmarks. If there are not (since this is still a design), how will you track that these will be created?

### Dependencies
* Dependencies: does this proposal add any new dependencies to SIG repo of TensorFlow.js?
* Dependent projects: are there other projects of TensorFlow.js SIG that this affects? How have you identified these dependencies and are you sure they are complete? If there are dependencies, how are you managing those changes?

### Engineering Impact
* Additional maintenance cost of maintaining binaries.
* Do you expect changes to binary size / startup time / build time / test times?

### Platforms and Environments
In order of priority, the platforms we plan to support are:
1. Linux x86 and ARM64, especially Raspberry Pi.
2. Windows x86 (use case is low power kiosk machines / [PC Sticks](https://www.amazon.com/Computer-Windows-Support-Bluetooh-AIOEXPC/dp/B08G1CCWN5/ref=asc_df_B08G1CCWN5/?tag=hyprod-20&linkCode=df0&hvadid=459623382939&hvpos=&hvnetw=g&hvrand=5388614202533491403&hvpone=&hvptwo=&hvqmt=&hvdev=c&hvdvcmdl=&hvlocint=&hvlocphy=9031136&hvtargid=pla-980775817871&th=1)).
3. Possibly ARM32 for lower end devices (TODO: Find example devices?)
4. Possibly Mac x86 and ARM64, but less likely due to maintenance cost and available alternatives (tfjs-node), but we are open to community feedback on this.

### Best Practices
* Does this proposal change best practices for some aspect of using/developing TensorFlow.js? How will these changes be communicated/enforced?

### Tutorials and Examples
* It is recommended to create end-to-end examples (ideally, a tutorial) which reflects how new feature will be used. Some things to consider related to the tutorial:
    - It should show the usage of the new feature in an end to end example.
    - This should be written as if it is documentation of the new feature, i.e., consumable by a user, not a TensorFlow.js developer. 
    - The code does not need to work (since the feature is not implemented yet) but the expectation is that the code does work before the feature can be merged. 

### Compatibility
* How will this proposal interact with other parts of the TensorFlow.js Ecosystem?
    - How will it work with TFJS models?
    - How will it work with TFJS-node?
    - Will this work on various TFJS backends?
    - How will it work with TFJS model types (graph/layers)?

### User Impact
* What are the user-facing changes? How will this feature be rolled out?

## Detailed Design

This section is optional. Elaborate on details if they’re important to
understanding the design, but would make it hard to read the proposal section
above.

## Questions and Discussion Topics

### Where should we implement this?
1. `tfjs-tflite`
  * Pros: Keeps tflite support in one place. Easier for users to use the same package for node and web.
  * Cons: Does not have node-gyp or node-gn set up. Does not work in node currently. Platform differences may force API differences anyway (e.g. dynamically loading a delegate may not be possible on the web).
2. `tfjs-node`
  * Pros: Already works with node. Already has node-gyp set up. 
  * Cons: Possibly confusing to have full Tensorflow and Tensorflow Lite support in the same package? 
3. Another package, e.g. `tfjs-tflite-node`
  * Pros: Clean slate. Does not affect existing codebase. Any weird requirements of node-gyp or the plugin system can be implemented without breaking anything else.
  * Cons: Another package to maintain, publish, make users aware of etc. Further fragments our offerings.
 
Seed this with open questions you require feedback on from the RFC process.

### Building the native addon
Generate Your Projects (GYP) is [very deprecated](https://en.wikipedia.org/wiki/GYP_(software)) but is still the main way native node modules are compiled. Almost all native modules build using [node-gyp](https://github.com/nodejs/node-gyp). The demo uses node-gyp.

There was some discussion in the node community of switching to GN/Ninja for native addons. This resulted in the [node-gn](https://github.com/Shouqun/node-gn) project, which doesn't seem active anymore.

We could instead try to use Bazel to build the native modules, but this would likely be a mistake with the current state of tooling (no community support, no ARM build).

### Building / Sourcing libtensorflowlite and libedgetpu
TFLite only distributes Android and iOS binaries, and it's currently excluded from the main TensorFlow (non-lite) build. If it were included in the main build, we could use that and build off of `tfjs-node`. Otherwise, we may need to build and host our own binaries. This is easy for Linux platforms, and we can cross-compile to ARM, but it may be more difficult for Window and MacOS.

libedgetpu has precompiled binaries available for linux x86, ARM64, ARM32, Mac x86, and Windows x86, so we should just use those. Alternatively, we can require users to install libedgetpu, which might be necessary to get it to correctly detect and flash Coral USB devices.

### Delegate Plugin System
How do we make plugins as seamless to users as possible? 
