# Coral Support for TFJS Node

| Status        | Proposed       |
:-------------- |:---------------------------------------------------- |
| **RFC #**     | [NNN](https://github.com/tfjs-sig/pull/NNN) (update when you have community PR #)|
| **Author(s)** | Matthew Soulanille (msoulanille@google.com) | Jason Mayes (jmayes@google.com)
| **Sponsor**   | A N Expert (whomever@tensorflow.org)                 |
| **Updated**   | 2021-11-16                                          |


## Objective

Enable the tfjs-node backend to run tflite models and support accelerating those models with a Coral accelerator in a standardized manner agnostic to the form factor of the Coral device.

Currently the Coral device is available in multiple form factors:

1. As a standalone USB dongle that can be plugged into an edge device such as a Raspberry Pi. This will be the primary device form factor to support.
2. Directly integrated onboard with the developer kit such as the [Tinker Edge T](https://tinker-board.asus.com/product/tinker-edge-t.html).
3. Via PCIe interface such as [this offering from Asus](https://iot.asus.com/products/AI-accelerator/AI-Accelerator-PCIe-Card/).

If the Linux driver (libedgetpu.so) provides access to all form factors, then an interface to this driver from Node should be provided via TensorFlow.js APIs such that the user can specify the correct interface and send arbitary TFLite models to the Coral accelerator for ML inference.

As TensorFlow.js models in the model.json format can not be executed on the Coral accelerators directly, we will only support the loading of TFLite models via our API to be deployed to Coral accelerators. Conversion of TensorFlow.js models to this format requiredby the Coral device is outside of scope of this proposal but could be investigated if large enough demand in the future.


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

## Design Proposal

This is the meat of the document, where you explain your proposal. If you have
multiple alternatives, be sure to use sub-sections for better separation of the
idea, and list pros/cons to each approach. If there are alternatives that you
have eliminated, you should also list those here, and explain why you believe
your chosen approach is superior.

Make sure you’ve thought through and addressed the following sections. If a section is not relevant to your specific proposal, please explain why, e.g. your RFC addresses a convention or process, not an API.


### Alternatives Considered
* Make sure to discuss the relative merits of alternatives to your proposal.

### Performance Implications
* Do you expect any (speed / memory)? How will you confirm?
* There should be end-to-end tests and benchmarks. If there are not (since this is still a design), how will you track that these will be created?

### Dependencies
* Dependencies: does this proposal add any new dependencies to SIG repo of TensorFlow.js?
* Dependent projects: are there other projects of TensorFlow.js SIG that this affects? How have you identified these dependencies and are you sure they are complete? If there are dependencies, how are you managing those changes?

### Engineering Impact
* Do you expect changes to binary size / startup time / build time / test times?

### Platforms and Environments
* Platforms: does this work on all platforms supported by TensorFlow.js? If not, why is that ok? Will it work on browser or node?
* Execution environments (CPU/WebGL/WASM/WebGPU/node.js): what impact do you expect and how will you confirm?

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

Seed this with open questions you require feedback on from the RFC process.
