/// <reference lib="webworker" />

import * as dagre from 'dagre';

import {WorkerCommand, WorkerMessage} from '../common/types';
import {ModelGraph, ModelGraphNode} from '../data_model/run_results';

addEventListener('message', ({data}) => {
  const msg = data as WorkerMessage;
  switch (msg.cmd) {
    case WorkerCommand.LAYOUT:
      layoutModelGraph(msg.modelGraph);
      const resp: WorkerMessage = {
        cmd: WorkerCommand.LAYOUT_RESULT,
        configIndex: msg.configIndex,
        modelGraph: msg.modelGraph,
      };
      postMessage(resp);
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
function layoutModelGraph(modelGraph: ModelGraph) {
  const graph = new dagre.graphlib.Graph<ModelGraphNode>();
  // Separation between nodes.
  graph.setGraph({nodesep: 10});
  // We don't need to show edge labels.
  graph.setDefaultEdgeLabel(() => ({}));

  // Add all nodes and edges to the dagre graph.
  for (const node of Object.values(modelGraph)) {
    graph.setNode(node.id, node);

    if (node.inputNodeIds) {
      for (const parentNodeId of node.inputNodeIds) {
        if (modelGraph[parentNodeId]) {
          graph.setEdge(parentNodeId, node.id);
        }
      }
    }
  }

  // Layout.
  dagre.layout(graph);
}
