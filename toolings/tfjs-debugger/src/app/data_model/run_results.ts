// TODO: update when the types are exported in the new converter release.
// tslint:disable-next-line:no-imports-from-dist
import {INodeDef} from '@tensorflow/tfjs-converter/dist/data/compiled_api';

/**
 * Stores the run results.
 *
 * Run results include model graph topology and metadata, values for all
 * intermediate nodes, and performance data. These are stored separately for
 * easier processing by different components.
 *
 * TODO: consider changing modelGraph and valueResult to arrays for
 * extensibility. Also the main configs.
 */
export interface RunResults {
  /**
   * Model graph from configuration 1. Undefined means the data has not been
   * loaded yet.
   */
  modelGraph1?: ModelGraph;

  /**
   * Model graph from configuration 2. Undefined means it is the same as
   * modelGraph1.
   */
  modelGraph2?: ModelGraph;

  /**
   * Value results (e.g. tensor output) for configuration 1. Undefined means
   * the data has not been loaded yet.
   */
  valueResult1?: ValueResult;

  /**
   * Value results (e.g. tensor output) for configuration 2. Undefined means
   * the data has not been loaded yet.
   */
  valueResult2?: ValueResult;

  // TODO: add performance results as needed.
}

/**
 * Stores the model graph topology and metadata (id, attributes, etc) indexed
 * by node ids.
 *
 * This is essentially our internal representation of model.json file.
 */
export interface ModelGraph {
  [nodeId: string]: ModelGraphNode;
}

/** Stores the topology and metadata for a single node.  */
export interface ModelGraphNode {
  /** The id of the node. */
  id: string;

  /** The op name of the node. */
  op: string;

  /** Ids of input nodes. */
  inputNodeIds: string[];

  /** Ids of output nodes */
  outputNodeIds: string[];

  /**
   * The width of the node.
   *
   * This is needed for layout.
   */
  width: number;

  /**
   * The height of the node.
   *
   * This is needed for layout.
   */
  height: number;

  /** The x coordinate after layout is done. */
  x?: number;

  /** The y coordinate after layout is done. */
  y?: number;
}

/** Stores data for an edge in the layout results. */
export interface ModelGraphLayoutEdge {
  fromNodeId: string;
  toNodeId: string;
  controlPoints: Array<{x: number; y: number;}>;
}

/** Stores the layout results for a model graph. */
export interface ModelGraphLayout {
  nodes: ModelGraphNode[];
  edges: ModelGraphLayoutEdge[];
}

/** Stores the value result (e.g. tensor output) indexed by node ids. */
export interface ValueResult {
  [nodeId: string]: NodeValueResult;
}

/** Stores the value result for a single node. */
export interface NodeValueResult {
  // TODO: add fields.
}

/** The type that matches the model.json file. */
export declare interface ModelJson {
  modelTopology: {
    node: INodeDef[],
  };
}

/** Converts the given model.json object to ModelGraph. */
export function modelJsonToModelGraph(json: ModelJson): ModelGraph {
  const modelGraph: ModelGraph = {};

  // Output node ids indexed by source node ids.
  const outputNodeIds: {[nodeId: string]: string[]} = {};
  for (const node of json.modelTopology.node) {
    if (node.input) {
      for (const inputNodeId of node.input) {
        if (!outputNodeIds[inputNodeId]) {
          outputNodeIds[inputNodeId] = [];
        }
        outputNodeIds[inputNodeId].push(node.name || '');
      }
    }
  }

  for (const node of json.modelTopology.node) {
    if (!node.name) {
      continue;
    }
    const op = node.op || '';
    modelGraph[node.name] = {
      // Use node name as id since it is unique.
      id: node.name,
      op,
      width: op.toLowerCase() === 'const' ? 56 : 90,
      height: 28,
      inputNodeIds: node.input || [],
      outputNodeIds: outputNodeIds[node.name] || [],
    };
  }
  return modelGraph;
}
