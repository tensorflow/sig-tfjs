/**
 * @license
 * Copyright 2021 Google LLC. All Rights Reserved.
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

import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {Store} from '@ngrx/store';
import {skip, withLatestFrom} from 'rxjs';
import {DEFAULT_BAD_NODE_THRESHOLD} from 'src/app/common/consts';
import {UrlParamKey} from 'src/app/common/types';
import {getPctDiffString} from 'src/app/common/utils';
import {Diffs, ModelGraph, ModelGraphNode} from 'src/app/data_model/run_results';
import {RunResultService} from 'src/app/services/run_result_service';
import {UrlService} from 'src/app/services/url_service';
import {setBadNodesThreshold} from 'src/app/store/actions';
import {selectBadNodesThreshold, selectDiffs, selecteSelectedEdgeId, selectModelGraph, selectSelectedNodeId, selectValueFromUrl} from 'src/app/store/selectors';
import {AppState} from 'src/app/store/state';

import {GraphService} from '../graph_panel/graph_service';

import {NodeInfo, Value} from './types';

interface Overview {
  numTotalNodes: number;
  numBadNodes: number;
  inputNodes: NodeInfo[];
  outputNodes: NodeInfo[];
  badNodes: NodeInfo[];
}

/**
 * The info panel located at the right side of the screen. It shows the summary
 * of the run and the detailed data for the selected node in the model graph.
 */
@Component({
  selector: 'info-panel',
  templateUrl: './info_panel.component.html',
  styleUrls: ['./info_panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InfoPanel implements OnInit {
  private curModelGraph?: ModelGraph;
  private curDiffs?: Diffs;

  selectedNodeId?: string;
  selectedEdgeId?: string;
  overview?: Overview;
  threshold = -1;

  constructor(
      private readonly graphService: GraphService,
      private readonly runResultService: RunResultService,
      private readonly urlService: UrlService,
      private readonly changeDetectionRef: ChangeDetectorRef,
      private readonly store: Store<AppState>,
  ) {}

  ngOnInit() {
    this.store.select(selectDiffs)
        .pipe(withLatestFrom(
            this.store.select(selectModelGraph(0)),
            this.store.select(selectBadNodesThreshold)))
        .subscribe(([diffs, modelGraph, threshold]) => {
          if (!modelGraph) {
            return;
          }
          this.handleGetRunResult(diffs, modelGraph, threshold);
        });

    this.store.select(selectSelectedNodeId).subscribe((nodeId) => {
      this.handleNodeSelected(nodeId);
    });

    this.store.select(selecteSelectedEdgeId).subscribe((edgeId) => {
      this.handleEdgeSelected(edgeId);
    });

    // Update currently selected backend from URL.
    this.store.select(selectValueFromUrl(UrlParamKey.BAD_NODES_THRESHOLD))
        .subscribe((strThreshold) => {
          let threshold: number = Number(strThreshold);
          if (isNaN(threshold)) {
            threshold = DEFAULT_BAD_NODE_THRESHOLD;
          }
          this.threshold = threshold;

          // Update store.
          this.store.dispatch(setBadNodesThreshold({threshold}));
        });

    // Handle threshold changes.
    this.store.select(selectBadNodesThreshold)
        .pipe(skip(1))
        .subscribe(threshold => {
          if (this.curModelGraph) {
            this.handleGetRunResult(
                this.curDiffs, this.curModelGraph, threshold);
          }
        });
  }

  noBadNodes(): boolean {
    if (!this.overview) {
      return true;
    }
    return this.overview.badNodes.length === 0;
  }

  showOverview(): boolean {
    return this.overview != null &&
        (this.selectedNodeId == null || this.selectedNodeId === '') &&
        (this.selectedEdgeId == null || this.selectedEdgeId === '');
  }

  showNodeDetails(): boolean {
    return this.selectedNodeId != null && this.selectedNodeId !== '';
  }

  showEdgeDetails(): boolean {
    return this.selectedEdgeId != null && this.selectedEdgeId !== '';
  }

  showEmptyMessage(): boolean {
    return !this.curDiffs;
  }

  hasBadNodes(): boolean {
    return this.overview != null && this.overview.badNodes.length > 0;
  }

  getNodeSectionTitle(baseLabel: string, nodes: NodeInfo[]): string {
    const count = nodes.length;
    return `${baseLabel} node${count === 1 ? '' : 's'} (${count})`;
  }

  handleThresholdChanged() {
    // Update url with selected backend id.
    this.urlService.updateUrlParameters(
        {[UrlParamKey.BAD_NODES_THRESHOLD]: this.threshold});
  }

  getSelectedNodeInfo(): NodeInfo|undefined {
    if (!this.curModelGraph || !this.selectedNodeId) {
      return undefined;
    }
    const node = this.curModelGraph[this.selectedNodeId];
    return this.nodeToNodeInfo(node, this.curDiffs, true);
  }

  getSelectedNodeInputs(): NodeInfo[] {
    if (!this.curModelGraph || !this.selectedNodeId) {
      return [];
    }

    // TODO: handle "show const node" checkbox.
    const node = this.curModelGraph[this.selectedNodeId];
    return node.inputNodeIds
        .filter(
            id => this.curModelGraph![id] &&
                this.curModelGraph![id].op !== 'Const')
        .map(id => this.nodeToNodeInfo(this.curModelGraph![id], this.curDiffs));
  }

  getSelectedNodeOutputs(): NodeInfo[] {
    if (!this.curModelGraph || !this.selectedNodeId) {
      return [];
    }

    const node = this.curModelGraph[this.selectedNodeId];
    return node.outputNodeIds.filter(id => this.curModelGraph![id])
        .map(id => this.nodeToNodeInfo(this.curModelGraph![id], this.curDiffs));
  }

  getEdgeOverview(): string {
    if (!this.selectedEdgeId || !this.curModelGraph) {
      return '';
    }

    const [fromNodeId, toNodeId] = this.selectedEdgeId.split('___');
    const fromNode = this.curModelGraph[fromNodeId];
    const toNode = this.curModelGraph[toNodeId];
    return `${fromNode.op} → ${toNode.op}`;
  }

  getEdgeSourceNode(): NodeInfo|undefined {
    if (!this.selectedEdgeId || !this.curModelGraph) {
      return undefined;
    }

    const fromNodeId = this.selectedEdgeId.split('___')[0];
    const fromNode = this.curModelGraph[fromNodeId];
    return this.nodeToNodeInfo(fromNode, this.curDiffs);
  }

  getEdgeTargetNode(): NodeInfo|undefined {
    if (!this.selectedEdgeId || !this.curModelGraph) {
      return undefined;
    }

    const toNodeId = this.selectedEdgeId.split('___')[1];
    const fromNode = this.curModelGraph[toNodeId];
    return this.nodeToNodeInfo(fromNode, this.curDiffs);
  }

  handleClickFitEdgeToView() {
    this.graphService.fitEdge();
  }

  private handleGetRunResult(
      diffs: Diffs|undefined, modelGraph: ModelGraph, threshold: number) {
    this.curModelGraph = modelGraph;
    this.curDiffs = diffs;

    // TODO: handle "show const node" checkbox.
    const numTotalNodes = Object.keys(modelGraph)
                              .filter(id => modelGraph[id].op !== 'Const')
                              .length;
    let numBadNodes = 0;
    let badNodes: ModelGraphNode[] = [];
    if (diffs && Object.keys(diffs).length > 0) {
      const badNodeIds =
          Object.keys(diffs).filter(key => Math.abs(diffs[key]) >= threshold);
      badNodes = badNodeIds.map(id => modelGraph[id]);
      numBadNodes = badNodes.length;
    } else {
      numBadNodes = -1;
    }

    const inputNodes =
        Object.values(modelGraph)
            .filter(
                node => node.inputNodeIds.length === 0 && node.op !== 'Const');
    const outputNodes = Object.values(modelGraph)
                            .filter(node => node.outputNodeIds.length === 0);
    this.overview = {
      numTotalNodes,
      numBadNodes,
      inputNodes: this.sortNodeInfoListByPosY(
          inputNodes.map(node => this.nodeToNodeInfo(node))),
      outputNodes: this.sortNodeInfoListByPosY(
          outputNodes.map(node => this.nodeToNodeInfo(node, diffs))),
      badNodes: this.sortNodeInfoListByPosY(
          badNodes.map(node => this.nodeToNodeInfo(node, diffs))),
    };
    this.changeDetectionRef.markForCheck();
  }

  private handleNodeSelected(nodeId?: string) {
    this.selectedNodeId = nodeId;
    this.changeDetectionRef.markForCheck();
  }

  private handleEdgeSelected(edgeId?: string) {
    this.selectedEdgeId = edgeId;
    this.changeDetectionRef.markForCheck();
  }

  private nodeToNodeInfo(
      node: ModelGraphNode, diffs?: Diffs, includeValues = false): NodeInfo {
    let shape = node.shape;
    let dtype = node.dtype;
    if (this.runResultService.result1) {
      const resultNode = this.runResultService.result1[node.id];
      if (resultNode) {
        shape = resultNode.shape;
        dtype = resultNode.dtype;
      }
    }
    const nodeInfo: NodeInfo = {
      id: node.id,
      y: node.y!,
      op: node.op,
      dtypeAndShape: `${dtype} [${shape.join(', ')}]`,
    };
    if (diffs) {
      const diffValue = diffs[node.id];
      if (diffValue != null) {
        nodeInfo.diffValue = diffValue;
        nodeInfo.diff = getPctDiffString(diffValue);
      }
    }
    if (includeValues && this.runResultService.result1 &&
        this.runResultService.result2) {
      const values1 = this.runResultService.result1[node.id]?.values;
      const values2 = this.runResultService.result2[node.id]?.values;
      if (values1 != null && values2 != null &&
          values1.length === values2.length) {
        const len = Math.min(100, values1.length);
        const values: Value[] = [];
        for (let i = 0; i < len; i++) {
          values.push({
            v1: Math.abs(values1[i]) < 1e-7 ? 0 : values1[i],
            v2: Math.abs(values2[i]) < 1e-7 ? 0 : values2[i],
          });
        }
        nodeInfo.values = values;
      }
    }
    return nodeInfo;
  }

  private sortNodeInfoListByPosY(nodes: NodeInfo[]) {
    return nodes.sort((a, b) => a.y - b.y);
  }
}
