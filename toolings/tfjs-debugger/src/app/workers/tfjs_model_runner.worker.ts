/// <reference lib="webworker" />

import {LOCAL_BUILD_LAEL, NODE_NAME_PARTS_TO_SKIP} from '../common/consts';
import {RunTfjsModelRequest, RunTfjsModelResponse, WorkerCommand, WorkerMessage} from '../common/types';
import {Configuration} from '../data_model/configuration';
import {PackageSource} from '../data_model/local_build_setting';
import {TensorMap} from '../data_model/run_results';

const LOCAL_CORE_PATH =
    'link-package/node_modules/@tensorflow/tfjs-core/dist/tf-core.js';
const LOCAL_CONVERTER_PATH =
    'link-package/node_modules/@tensorflow/tfjs-converter/dist/tf-converter.js';
const LOCAL_BACKEND_WASM_PATH =
    'link-package/node_modules/@tensorflow/tfjs-backend-wasm/dist/';

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
  const showConstNodes = req.showConstNodes;
  const nodeIds =
      Object.values(req.modelGraph)
          .filter(
              node => (showConstNodes ||
                       (!showConstNodes && node.op !== 'Const')) &&
                  !NODE_NAME_PARTS_TO_SKIP.some(p => node.id.includes(p)) &&
                  node.dtype !== 'resource')
          .map(node => node.id);

  // Load packages.
  const {tf, errorMsg} = await loadTfjsPackegesAndSetBackend(req.config);
  if (errorMsg) {
    sendRespWithError(`Failed to load TFJS packages: ${errorMsg}`);
    return;
  }

  let model;
  try {
    model = await tf.loadGraphModel(
        req.modelUrl, {fromTFHub: req.modelUrl.includes('tfhub.dev')});
  } catch (e: any) {
    sendRespWithError(`Failed to load model graph: ${e.message}`);
    return;
  }

  // Set inputs.
  const namedTensorMap: {[name: string]: {}} = {};
  try {
    for (const name of Object.keys(req.inputs)) {
      const input = req.inputs[name];
      namedTensorMap[name] = tf.tensor(input.values, input.shape, input.dtype);
    }
  } catch (e: any) {
    sendRespWithError(`Failed to create input tensor: ${e.message}`);
    return;
  }

  // Run model and gather outputs.
  let outs: any = [];
  try {
    outs = await model.executeAsync(namedTensorMap, nodeIds);
  } catch (e: any) {
    sendRespWithError(`Failed to run model: ${e.message}`);
    return;
  }
  const outputTensorMap: TensorMap = {};
  for (let i = 0; i < nodeIds.length; i++) {
    const nodeId = nodeIds[i];
    const tensor = outs[i];
    try {
      outputTensorMap[nodeId] = {
        values: tensor.dataSync().slice(),
        shape: tensor.shape,
        dtype: tensor.dtype,
      };
    } catch (e: any) {
      console.warn(e.message);
    }
  }

  // Send the result back.
  const resp: RunTfjsModelResponse = {
    cmd: WorkerCommand.RUN_TFJS_MODEL_RESULT,
    // outputs: {},
    outputs: outputTensorMap,
  };
  postMessage(resp, Object.values(outputTensorMap).map(t => t.values.buffer));
}

async function loadTfjsPackegesAndSetBackend(config: Configuration):
    Promise<{tf?: any; errorMsg?: string}> {
  const version = config.backendVersion!;
  const backend = config.backendId!;
  try {
    let tf;
    // Non local build.
    if (version !== LOCAL_BUILD_LAEL) {
      importScripts(`https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@${
          version}/dist/tf.js`);
      // Set backend.
      tf = (globalThis as any)['tf'];
      if (tf == null) {
        return {tf, errorMsg: 'Failed to initialize tfjs'};
      }

      if (backend === 'wasm') {
        importScripts(
            `https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@${
                version}/dist/tf-backend-wasm.js`);
        tf.wasm.setWasmPaths(
            `https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@${
                version}/dist/`);
      }
    }
    // Local build.
    else {
      const localBuildSetting = config.localBuildSetting!;
      const coreConverterVersion =
          localBuildSetting.coreConverterReleaseVersion;

      // Load core.
      if (localBuildSetting.coreSource === PackageSource.LOCAL) {
        importScripts(LOCAL_CORE_PATH);
      } else {
        importScripts(`https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-core@${
            coreConverterVersion}/dist/tf-core.js`);
      }

      // Load converter.
      if (localBuildSetting.converterSource === PackageSource.LOCAL) {
        importScripts(LOCAL_CONVERTER_PATH);
      } else {
        importScripts(
            `https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-converter@${
                coreConverterVersion}/dist/tf-converter.js`);
      }

      tf = (globalThis as any)['tf'];
      if (tf == null) {
        return {tf, errorMsg: 'Failed to initialize tfjs'};
      }

      // Load backend.
      if (localBuildSetting.backendSource === PackageSource.LOCAL) {
        importScripts(`link-package/node_modules/@tensorflow/tfjs-backend-${
            backend}/dist/tf-backend-${backend}.js`);
        if (backend === 'wasm') {
          tf.wasm.setWasmPaths(LOCAL_BACKEND_WASM_PATH);
        }
      } else {
        importScripts(`https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-${
            backend}@${coreConverterVersion}/dist/tf-backend-${backend}.js`);
        if (backend === 'wasm') {
          tf.wasm.setWasmPaths(
              `https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@${
                  coreConverterVersion}/dist/`);
        }
      }
    }
    await tf.setBackend(backend);

    return {tf};
  } catch (e: any) {
    let errorMsg = e.message;
    if (errorMsg.startsWith(`Failed to execute 'importScripts' `)) {
      errorMsg = errorMsg.substring(Number(errorMsg.indexOf(':')) + 1).trim();
    }
    return {tf: undefined, errorMsg};
  }
}

function sendRespWithError(errorMsg: string) {
  const resp: RunTfjsModelResponse = {
    cmd: WorkerCommand.RUN_TFJS_MODEL_RESULT,
    errorMsg,
    outputs: {},
  };
  postMessage(resp);
}
