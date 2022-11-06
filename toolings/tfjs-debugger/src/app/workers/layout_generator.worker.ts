/**
 * @license
 * Copyright 2022 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

/// <reference lib="webworker" />

import {LayoutBatchRequest, LayoutBatchResponse, LayoutRequest, LayoutResponse, WorkerCommand, WorkerMessage} from '../common/types';
import {Configuration} from '../data_model/configuration';
import {ModelGraph, ModelGraphLayout, ModelGraphLayoutEdge, ModelGraphNode} from '../data_model/run_results';

const BATCH_SIZE = 800;

let curTasks: LayoutBatchRequest[] = [];
let curResults: LayoutBatchResponse[] = [];
let curTaskIndex = 0;
let curConfigIndex = 0;

// Create a worker pool.
const workers: Worker[] = [];
for (let i = 0; i < navigator.hardwareConcurrency / 2; i++) {
  const worker = new Worker(new URL('./layout_batch.worker', import.meta.url));
  workers.push(worker);
  worker.onmessage = ({data}: MessageEvent<LayoutBatchResponse>) => {
    curResults.push(data);

    if (curTaskIndex <= curTasks.length - 1) {
      dispatchTaskToWorker(worker);
    } else if (curResults.length === curTasks.length) {
      processResults();
    }
  };
}

addEventListener('message', ({data}) => {
  const msg = data as WorkerMessage;
  switch (msg.cmd) {
    case WorkerCommand.LAYOUT:
      const req = msg as LayoutRequest;
      layoutModelGraph(req.modelGraph, req.configIndex, req.config);
      break;
    default:
      break;
  }
});

/**
 * Runs dagre to layout the given model graph. The layout result (x and y
 * coordinates) will be stored directly inside each ModelGraphNode in
 * ModelGraph.
 */
function layoutModelGraph(
    modelGraph: ModelGraph, configIndex: number, config: Configuration) {
  curTasks = [];
  curResults = [];
  curConfigIndex = configIndex;
  curTaskIndex = 0;

  // Break nodes into batches.
  const batches: ModelGraphNode[][] = [];
  let curBatch: ModelGraphNode[] = [];
  const allNodes = Object.values(modelGraph);
  let c = 0;
  for (let i = 0; i < allNodes.length; i++) {
    const node = allNodes[i];
    if (!config.showConstNodes && node.op === 'Const') {
      continue;
    }
    if (c % BATCH_SIZE === 0) {
      curBatch = [];
      batches.push(curBatch);
    }
    curBatch.push(node);
    c++;
  }

  // Send to workers to do layout.
  for (let i = 0; i < batches.length; i++) {
    const nodes = batches[i];
    curTasks.push(
        {cmd: WorkerCommand.LAYOUT_BATCH, nodes, align: 'DL', batchIndex: i});
    curTasks.push(
        {cmd: WorkerCommand.LAYOUT_BATCH, nodes, align: 'DR', batchIndex: i});
  }
  for (let i = 0; i < Math.min(workers.length, curTasks.length); i++) {
    dispatchTaskToWorker(workers[i]);
  }
}

function dispatchTaskToWorker(worker: Worker) {
  worker.postMessage(curTasks[curTaskIndex]);
  curTaskIndex++;
}

function processResults() {
  const layoutResultsDL: LayoutBatchResponse[] = [];
  const layoutResultsDR: LayoutBatchResponse[] = [];
  for (const result of curResults) {
    if (result.align === 'DL') {
      layoutResultsDL.push(result);
    } else if (result.align === 'DR') {
      layoutResultsDR.push(result);
    }
  }
  const layoutDL = processResultForOneAlign(layoutResultsDL);
  const layoutDR = processResultForOneAlign(layoutResultsDR);
  const layout =
      layoutDL.graphWidth <= layoutDR.graphWidth ? layoutDL : layoutDR;

  const resp: LayoutResponse = {
    cmd: WorkerCommand.LAYOUT_RESULT,
    configIndex: curConfigIndex,
    modelGraphLayout: layout,
  };
  postMessage(resp);
}

function processResultForOneAlign(results: LayoutBatchResponse[]):
    ModelGraphLayout {
  // Process batches so that the batch n is placed right below the batch n-1,
  // and align batch n's top node with batch n's bottom node.
  //
  results.sort((a, b) => a.batchIndex - b.batchIndex);

  let minNodeX = Number.MAX_VALUE;
  let minNodeY = Number.MAX_VALUE;
  let maxNodeX = Number.NEGATIVE_INFINITY;
  let maxNodeY = Number.NEGATIVE_INFINITY;
  let curBottomNodeX = 0;
  let numConstNodes = 0;
  let numNoneConstNodes = 0;

  const nodes: ModelGraphNode[] = [];
  const edges: ModelGraphLayoutEdge[] = [];
  const edgesSet = new Set<string>();
  const nodesMap: {[id: string]: ModelGraphNode} = {};
  let prevMaxY = 0;
  let prevBottomNodeX = 0;
  let prevMinX = 0;
  let prevMaxX = 0;
  for (let i = 0; i < results.length; i++) {
    const result = results[i];

    // Calculate the offset x and y for batch n to move so that it is placed
    // under and aligned with batch n-1.
    let curMaxY = Number.NEGATIVE_INFINITY;
    let curMinX = Number.MAX_VALUE;
    let curMaxX = Number.NEGATIVE_INFINITY;
    let offsetX = 0;
    let offsetY = 0;
    if (i !== 0) {
      let minY = Number.MAX_VALUE;
      let minX = Number.MAX_VALUE;
      let maxX = Number.NEGATIVE_INFINITY;
      let topNodeX = 0;
      result.nodes.forEach(node => {
        if (node.y! <= minY) {
          topNodeX = node.x!;
        }
        minY = Math.min(minY, node.y!);
        minX = Math.min(minX, node.x!);
        maxX = Math.max(maxX, node.x! + node.width);
      });
      offsetY = prevMaxY - minY + 40;
      offsetX = (prevMinX + prevMaxX) / 2 - (minX + maxX) / 2;
    }

    // Offset all nodes and edges in batch n.
    result.nodes.forEach(node => {
      if (node.op.toLowerCase() === 'const') {
        numConstNodes++;
      } else {
        numNoneConstNodes++;
      }
      node.x! += offsetX;
      node.y! += offsetY;

      if (node.y! > maxNodeY) {
        curBottomNodeX = node.x!;
      }
      minNodeX = Math.min(node.x!, minNodeX);
      minNodeY = Math.min(node.y!, minNodeY);
      maxNodeX = Math.max(node.x! + node.width, maxNodeX);
      maxNodeY = Math.max(node.y! + node.height, maxNodeY);
      curMaxY = Math.max(node.y! + node.height, curMaxY);
      curMinX = Math.min(node.x!, curMinX);
      curMaxX = Math.max(node.x! + node.width, curMaxX);

      nodes.push(node);
      nodesMap[node.id] = node;
    });

    result.edges.forEach(edge => {
      if (offsetY > 0) {
        edge.controlPoints = edge.controlPoints.map(
            pt => ({x: pt.x + offsetX, y: pt.y + offsetY}));
      }
      edges.push(edge);
      edgesSet.add(genEdgeKey(edge.fromNodeId, edge.toNodeId));
    });

    prevMaxY = curMaxY;
    prevBottomNodeX = curBottomNodeX;
    prevMinX = curMinX;
    prevMaxX = curMaxX;
  }

  // Manually connect edges across batches.
  for (const node of nodes) {
    for (const inputNodeId of node.inputNodeIds) {
      const edgeKey = genEdgeKey(inputNodeId, node.id);
      if (nodesMap[inputNodeId] && !edgesSet.has(edgeKey)) {
        const fromNode = nodesMap[inputNodeId];
        edges.push({
          fromNodeId: inputNodeId,
          toNodeId: node.id,
          controlPoints:
              [{x: fromNode.x!, y: fromNode.y!}, {x: node.x!, y: node.y!}],

        });
      }
    }
  }

  return {
    nodes,
    edges,
    graphWidth: maxNodeX - minNodeX,
    graphHeight: maxNodeY - minNodeY,
    numConstNodes,
    numNonConstNodes: numNoneConstNodes,
  };
}

function genEdgeKey(fromId: string, toId: string): string {
  return `${fromId}___${toId}`;
}
