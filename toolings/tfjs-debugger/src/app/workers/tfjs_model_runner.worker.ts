/// <reference lib="webworker" />

import {LOCAL_BUILD_LAEL} from '../common/consts';
import {RunTfjsModelRequest, RunTfjsModelResponse, WorkerCommand, WorkerMessage} from '../common/types';
import {Configuration} from '../data_model/configuration';
import {PackageSource} from '../data_model/local_build_setting';
import {TensorMap} from '../data_model/run_results';

// npx local-web-server -p 9876 --https

const LOCAL_CORE_PATH = 'dist/bin/tfjs-core/tfjs-core_pkg/dist/tf-core.js';
const LOCAL_CONVERTER_PATH =
    'dist/bin/tfjs-converter/tfjs-converter_pkg/dist/tf-converter.js';
const LOCAL_BACKEND_WASM_PATH =
    'dist/bin/tfjs-backend-wasm/tfjs-backend-wasm_pkg/dist/';

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
  const nodeIds = Object.values(req.modelGraph)
                      .filter(
                          node => (showConstNodes ||
                                   (!showConstNodes && node.op !== 'Const')) &&
                              !node.id.includes('/cond'))
                      .map(node => node.id);

  // Load packages.
  const {tf, errorMsg} = await loadTfjsPackegesAndSetBackend(req.config);
  if (errorMsg) {
    sendRespWithError(errorMsg);
    return;
  }

  let model;
  try {
    model = await tf.loadGraphModel(
        req.modelUrl, {fromTFHub: req.modelUrl.includes('tfhub.dev')});
  } catch (e: any) {
    sendRespWithError(e.message);
    return;
  }

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
      let localServerAddress = localBuildSetting.localServerAddress;
      if (!localServerAddress.startsWith('https://')) {
        localServerAddress = `https://${localServerAddress}`;
      }
      const coreConverterVersion =
          localBuildSetting.coreConverterReleaseVersion;

      // Load core.
      if (localBuildSetting.coreSource === PackageSource.LOCAL) {
        importScripts(`${localServerAddress}/${LOCAL_CORE_PATH}`);
      } else {
        importScripts(`https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-core@${
            coreConverterVersion}/dist/tf-core.js`);
      }

      // Load converter.
      if (localBuildSetting.converterSource === PackageSource.LOCAL) {
        importScripts(`${localServerAddress}/${LOCAL_CONVERTER_PATH}`);
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
        importScripts(`${localServerAddress}/dist/bin/tfjs-backend-${
            backend}/tfjs-backend-${backend}_pkg/dist/tf-backend-${
            backend}.js`);
        if (backend === 'wasm') {
          tf.wasm.setWasmPaths(
              `${localServerAddress}/${LOCAL_BACKEND_WASM_PATH}`);
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
