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
  [modelGraphId: string]: ModelGraphNode;
}

/** Stores the topology and metadata for a single node.  */
export interface ModelGraphNode {
  /** The id of the node. */
  id: string;

  /** The op name of the node. */
  op: string;

  /** Ids of input nodes. */
  inputNodeIds: string[];

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

/** Stores the value result (e.g. tensor output) indexed by node ids. */
export interface ValueResult {
  [modelGraphId: string]: NodeValueResult;
}

/** Stores the value result for a single node. */
export interface NodeValueResult {
  // TODO: add fields.
}

/** The type that matches the model.json file. */
export declare interface ModelJson {
  modelTopology: {
    node: [{
      name: string;
      op: string;
      input: string[];
      // TODO: add more as needed.
    }]
  };
}

/** Converts the given model.json object to ModelGraph. */
export function modelJsonToModelGraph(json: ModelJson): ModelGraph {
  const modelGraph: ModelGraph = {};

  for (const node of json.modelTopology.node) {
    modelGraph[node.name] = {
      // Use node name as id since it is unique.
      id: node.name,
      op: node.op,
      // TODO: calculate node size based on node's op and other factors.
      width: 60,
      height: 30,
      inputNodeIds: node.input,
    };
  }
  return modelGraph;
}
