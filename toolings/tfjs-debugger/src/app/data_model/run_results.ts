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

// TODO: update when the types are exported in the new converter release.
// tslint:disable-next-line:no-imports-from-dist
import {IAttrValue, INodeDef} from '@tensorflow/tfjs-converter/dist/data/compiled_api';

import {CONST_NODE_WIDTH, NODE_HEIGHT, NON_CONST_NODE_WIDTH} from '../common/consts';

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

  diffs?: Diffs;

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

  /** Data type */
  dtype: string;

  /** Shape */
  shape: number[];

  /** Attributes */
  attrs: NodeAttr[];

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

export interface NodeAttr {
  key: string;
  value: string;
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
  graphWidth: number;
  graphHeight: number;
  numConstNodes: number;
  numNonConstNodes: number;
}

export type TypedArray = Float32Array|Int32Array|Uint8Array;

export type TensorMap = {
  [id: string]: {
    values: TypedArray,
    shape: number[],
    dtype: string,
  };
};

export type Diffs = {
  [id: string]: number
};


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
    if (!node.name || node.name.includes('/cond/')) {
      continue;
    }
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
    let dtype = '';
    let shape: number[] = [];
    if (node.attr) {
      if (node.attr['dtype']) {
        dtype = getStrTypeFromDType(node.attr['dtype'].type as {} as string);
      }
      if (node.attr['shape']) {
        shape = (node.attr['shape'].shape?.dim ||
                 []).map(entry => Number(entry.size!));
      }
    }
    const attrs: NodeAttr[] = [];
    if (node.op !== 'Const') {
      Object.keys(node.attr || {}).forEach(key => {
        const attrValue = node.attr![key];
        let value = '';
        if (attrValue.list != null) {
          if (attrValue.list.s != null) {
            value =
                attrValue.list.s.map(v => decodeAttrValue({s: v})).join(', ');
          } else if (attrValue.list.b != null) {
            value =
                attrValue.list.b.map(v => decodeAttrValue({b: v})).join(', ');
          } else if (attrValue.list.f != null) {
            value =
                attrValue.list.f.map(v => decodeAttrValue({f: v})).join(', ');
          } else if (attrValue.list.i != null) {
            value =
                attrValue.list.i.map(v => decodeAttrValue({i: v})).join(', ');
          } else {
            value = '[]';
          }
        } else {
          value = decodeAttrValue(attrValue);
        }
        if (key !== 'T' && key !== 'dtype' && key !== 'shape') {
          attrs.push({key, value});
        }
      });
    }
    modelGraph[node.name] = {
      // Use node name as id since it is unique.
      id: node.name,
      op,
      dtype,
      attrs,
      shape,
      width: op.toLowerCase() === 'const' ? CONST_NODE_WIDTH :
                                            NON_CONST_NODE_WIDTH,
      height: NODE_HEIGHT,
      inputNodeIds: node.input || [],
      outputNodeIds: outputNodeIds[node.name] || [],
    };
  }
  return modelGraph;
}

function decodeAttrValue(attrValue: IAttrValue): string {
  if (attrValue.s != null) {
    return atob(attrValue.s);
  } else if (attrValue.i != null) {
    return String(attrValue.i);
  } else if (attrValue.f != null) {
    return String(attrValue.f);
  } else if (attrValue.b != null) {
    return String(attrValue.b);
  }
  return '';
}

function getStrTypeFromDType(dataType: string|undefined|null): string {
  switch (dataType) {
    case 'DT_FLOAT':
      return 'float32';
    case 'DT_INT32':
      return 'int32';
    case 'DT_INT8':
    case 'DT_BOOL':
      return 'int8';
    case 'DT_RESOURCE':
      return 'resource';
    default:
      return '';
  }
}
