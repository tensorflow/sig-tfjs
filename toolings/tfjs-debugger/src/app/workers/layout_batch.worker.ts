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

import * as dagre from 'dagre';

import {LayoutBatchRequest, LayoutBatchResponse, WorkerCommand, WorkerMessage} from '../common/types';
import {ModelGraphLayoutEdge, ModelGraphNode} from '../data_model/run_results';

addEventListener('message', ({data}) => {
  const msg = data as WorkerMessage;
  switch (msg.cmd) {
    case WorkerCommand.LAYOUT_BATCH:
      const resp = layoutBatch(msg as LayoutBatchRequest);
      postMessage(resp);
      break;
    default:
      break;
  }
});

function layoutBatch({nodes, align, batchIndex}: LayoutBatchRequest):
    LayoutBatchResponse {
  const graph = new dagre.graphlib.Graph<ModelGraphNode>();

  // Separation between nodes.
  graph.setGraph({
    nodesep: 20,
    ranksep: 40,
    align,
  });

  // We don't need to show edge labels.
  graph.setDefaultEdgeLabel(() => ({}));

  const nodesMap: {[id: string]: ModelGraphNode} = {};
  for (const node of nodes) {
    nodesMap[node.id] = node;
  }

  for (const node of nodes) {
    graph.setNode(node.id, node);

    if (node.inputNodeIds) {
      for (const parentNodeId of node.inputNodeIds) {
        if (nodesMap[parentNodeId]) {
          graph.setEdge(parentNodeId, node.id);
        }
      }
    }
  }

  // Layout.
  dagre.layout(graph);

  // Gather results.
  const edges: ModelGraphLayoutEdge[] = [];
  for (const edge of graph.edges()) {
    edges.push({
      fromNodeId: edge.v,
      toNodeId: edge.w,
      controlPoints: graph.edge(edge).points,
    });
  }

  return {
    cmd: WorkerCommand.LAYOUT_BATCH_RESULT,
    nodes,
    edges,
    align,
    batchIndex,
  };
}
