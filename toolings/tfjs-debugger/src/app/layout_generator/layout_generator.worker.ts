/// <reference lib="webworker" />

import * as dagre from 'dagre';

import {LayoutRequest, LayoutResponse, WorkerCommand, WorkerMessage} from '../common/types';
import {ModelGraph, ModelGraphLayout, ModelGraphLayoutEdge, ModelGraphNode} from '../data_model/run_results';

addEventListener('message', ({data}) => {
  const msg = data as WorkerMessage;
  switch (msg.cmd) {
    case WorkerCommand.LAYOUT:
      const req = msg as LayoutRequest;
      const layout = layoutModelGraph(req.modelGraph);
      const resp: LayoutResponse = {
        cmd: WorkerCommand.LAYOUT_RESULT,
        configIndex: req.configIndex,
        modelGraphLayout: layout,
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
function layoutModelGraph(modelGraph: ModelGraph): ModelGraphLayout {
  const graph = new dagre.graphlib.Graph<ModelGraphNode>();
  // Separation between nodes.
  graph.setGraph({
    nodesep: 20,
    ranksep: 40,
    // This could make certain layouts more "straight".
    //
    // See more options here:
    // https://github.com/dagrejs/dagre/wiki#configuring-the-layout
    align: 'DL',
  });
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

  // Gather results.
  const nodes = Object.values(modelGraph);
  const edges: ModelGraphLayoutEdge[] = [];
  for (const edge of graph.edges()) {
    edges.push({
      fromNodeId: edge.v,
      toNodeId: edge.w,
      controlPoints: graph.edge(edge).points,
    });
  }
  return {
    nodes,
    edges,
  };
}
