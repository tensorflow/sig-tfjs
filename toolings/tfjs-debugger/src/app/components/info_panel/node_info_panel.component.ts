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

import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit} from '@angular/core';
import {Store} from '@ngrx/store';
import {DEFAULT_BAD_NODE_THRESHOLD} from 'src/app/common/consts';
import {setNodeIdToLocate} from 'src/app/store/actions';
import {AppState} from 'src/app/store/state';

import {NodeInfo, Value} from './types';

@Component({
  selector: 'node-info-panel',
  templateUrl: './node_info_panel.component.html',
  styleUrls: ['./node_info_panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NodeInfoPanel implements OnInit {
  @Input() nodeInfo?: NodeInfo;

  constructor(
      private readonly changeDetectionRef: ChangeDetectorRef,
      private readonly store: Store<AppState>,
  ) {}

  ngOnInit() {}

  handleClickLocateNode() {
    if (!this.nodeInfo) {
      return;
    }

    this.store.dispatch(setNodeIdToLocate({nodeId: this.nodeInfo.id}));
  }

  isNodeBad() {
    if (!this.nodeInfo) {
      return false;
    }
    return Math.abs((this.nodeInfo.diffValue || 0)) >
        DEFAULT_BAD_NODE_THRESHOLD;
  }

  showValues() {
    if (!this.nodeInfo) {
      return false;
    }

    return this.nodeInfo.values != null;
  }

  getDiff(v: Value): string {
    if (v.v2 === 0) {
      return v.v1 === 0 ? '0%' : 'Inf';
    }
    let ret = `${((v.v1 - v.v2) / v.v2 * 100).toFixed(2)}%`;
    if (ret === '0.00%' || ret === '-0.00%') {
      ret = '0%';
    }
    return ret;
  }

  isDiffBad(v: Value): boolean {
    let diff = (v.v1 - v.v2) / v.v2;
    if (v.v2 === 0) {
      diff = v.v1 === 0 ? 0 : Infinity;
    }
    return Math.abs(diff) >= DEFAULT_BAD_NODE_THRESHOLD;
  }
}
