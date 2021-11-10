# Coral Support for TFJS Node

| Status        | Proposed       |
:-------------- |:---------------------------------------------------- |
| **RFC #**     | [NNN](https://github.com/tfjs-sig/pull/NNN) (update when you have community PR #)|
| **Author(s)** | Matthew Soulanille (msoulanille@google.com) |
| **Sponsor**   | A N Expert (whomever@tensorflow.org)                 |
| **Updated**   | 2021-11-09                                           |

## Objective

Enable the tfjs-node backend to run tflite models and support accelerating those models with a Coral USB accelerator.

TODO(mattsoulanille): More on this section.
## Motivation

This will address user needs for high performance inference on low power devices such as Raspberry PIs. 

TODO(mattsoulanille): More on this section.

Why this is a valuable problem to solve? What background information is needed
to show how this design addresses the problem?

Which users are affected by the problem? Why is it a problem? What data supports
this? What related work exists?

## User Benefit

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
