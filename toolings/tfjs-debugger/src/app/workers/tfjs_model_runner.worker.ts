/// <reference lib="webworker" />

import {RunTfjsModelRequest, RunTfjsModelResponse, WorkerCommand, WorkerMessage} from '../common/types';
import {TensorMap} from '../data_model/run_results';

addEventListener('message', ({data}) => {
  const msg = data as WorkerMessage;
  switch (msg.cmd) {
    case WorkerCommand.RUN_TFJS_MODEL:
      const req = msg as RunTfjsModelRequest;
      runTfjsModel(req);
      break;
    default:
      break;
  }
});

async function runTfjsModel(req: RunTfjsModelRequest) {
  // Node ids for getting results for.
  const nodeIds = Object.values(req.modelGraph)
                      .filter(node => !node.id.includes('/cond'))
                      .map(node => node.id);

  // Load packages.
  const version = req.config.backendVersion!;
  const backend = req.config.backendId!;
  importScripts(
      `https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@${version}/dist/tf.js`);
  const tf = (globalThis as any)['tf'];
  if (backend === 'wasm') {
    importScripts(`https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@${
        version}/dist/tf-backend-wasm.js`);
    tf.wasm.setWasmPaths(
        `https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@${
            version}/dist/`);
  }

  // Set backend.
  tf.setBackend(backend);
  const model = await tf.loadGraphModel(
      req.modelUrl, {fromTFHub: req.modelUrl.includes('tfhub.dev')});

  // Set inputs.
  const namedTensorMap: {[name: string]: {}} = {};
  for (const name of Object.keys(req.inputs)) {
    const input = req.inputs[name];
    // Convert -1 in shape to 1.
    const shape = input.shape.map(v => v === -1 ? 1 : v);
    namedTensorMap[name] = tf.tensor(input.values, shape, input.dtype);
  }

  // Run model and gather outputs.
  const outs = await model.executeAsync(namedTensorMap, nodeIds);
  const outputTensorMap: TensorMap = {};
  for (let i = 0; i < nodeIds.length; i++) {
    const nodeId = nodeIds[i];
    const tensor = outs[i];
    outputTensorMap[nodeId] = {
      values: tensor.dataSync().slice(),
      shape: tensor.shape,
      dtype: tensor.dtype,
    };
  }

  // Send the result back.
  const resp: RunTfjsModelResponse = {
    cmd: WorkerCommand.RUN_TFJS_MODEL_RESULT,
    // outputs: {},
    outputs: outputTensorMap,
  };
  postMessage(resp, Object.values(outputTensorMap).map(t => t.values.buffer));
}
