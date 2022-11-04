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
import {withLatestFrom} from 'rxjs';
import {DEFAULT_BAD_NODE_THRESHOLD} from 'src/app/common/consts';
import {Diffs, ModelGraph, ModelGraphNode} from 'src/app/data_model/run_results';
import {RunResultService} from 'src/app/services/run_result_service';
import {selectDiffs, selectModelGraph, selectSelectedNodeId} from 'src/app/store/selectors';
import {AppState} from 'src/app/store/state';

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
  overview?: Overview;
  threshold = DEFAULT_BAD_NODE_THRESHOLD;

  constructor(
      private readonly runResultService: RunResultService,
      private readonly changeDetectionRef: ChangeDetectorRef,
      private readonly store: Store<AppState>,
  ) {}

  ngOnInit() {
    this.store.select(selectDiffs)
        .pipe(withLatestFrom(this.store.select(selectModelGraph(0))))
        .subscribe(([diffs, modelGraph]) => {
          if (!diffs || !modelGraph) {
            return;
          }
          this.handleGetRunResult(diffs, modelGraph);
        });

    this.store.select(selectSelectedNodeId).subscribe((nodeId) => {
      this.handleNodeSelected(nodeId);
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
        (this.selectedNodeId == null || this.selectedNodeId === '');
  }

  showDetails(): boolean {
    return this.selectedNodeId != null && this.selectedNodeId !== '';
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
    console.log(this.threshold);
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

    const node = this.curModelGraph[this.selectedNodeId];
    return node.inputNodeIds.filter(id => this.curModelGraph![id])
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

  private handleGetRunResult(diffs: Diffs, modelGraph: ModelGraph) {
    this.curModelGraph = modelGraph;
    this.curDiffs = diffs;

    const numTotalNodes = Object.keys(modelGraph).length;
    const badNodeIds = Object.keys(diffs).filter(
        key => diffs[key] >= DEFAULT_BAD_NODE_THRESHOLD);
    const badNodes = badNodeIds.map(id => modelGraph[id]);
    const numBadNodes = badNodes.length;

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
        nodeInfo.diff = `${(diffValue * 100).toFixed(2)}%`;
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
          values.push({v1: values1[i], v2: values2[i]});
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
