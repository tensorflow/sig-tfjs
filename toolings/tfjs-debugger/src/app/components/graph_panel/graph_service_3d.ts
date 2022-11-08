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

import ForceGraph3D, {ForceGraph3DInstance} from '3d-force-graph';
import {Injectable} from '@angular/core';
import {Store} from '@ngrx/store';
import * as TWEEN from '@tweenjs/tween.js';
import {filter, withLatestFrom} from 'rxjs';
import {Diffs, ModelGraphLayout, ModelGraphLayoutEdge, ModelGraphNode} from 'src/app/data_model/run_results';
import {setNodeIdToLocate, setSelectedEdgeId, setSelectedNodeId} from 'src/app/store/actions';
import {selectBadNodesThreshold, selectDiffs, selecteSelectedEdgeId, selectNodeIdToLocate, selectSelectedNodeId} from 'src/app/store/selectors';
import {AppState} from 'src/app/store/state';
import * as THREE from 'three';

import {genEdgeId} from './utils';

const LOCALTE_NODE_DISTANCE = 500;
const LINK_COLOR = '#ddd';
const ARROW_COLOR = '#777';

/** Handles tasks related to 3d graph rendering. */
@Injectable({
  providedIn: 'root',
})
export class GraphService3d {
  private container!: HTMLElement;
  private curNodesMap: {[id: string]: ModelGraphNode} = {};
  private curGraph?: ForceGraph3DInstance;
  private curDiffs?: Diffs;
  private curThreshold = 0;
  private curSelectedNodeId = '';
  private curHoveredNodeId = '';
  private curHoveredEdgeId = '';
  private curSelectedEdgeId = '';
  private curBadNodeMeshes: {[id: string]: THREE.Object3D} = {};
  private paused = false;

  constructor(
      private readonly store: Store<AppState>,
  ) {
    this.store.select(selectSelectedNodeId).subscribe(nodeId => {
      if (!this.curGraph) {
        return;
      }

      this.curSelectedNodeId = nodeId || '';
      this.refreshGraph();
    });

    this.store.select(selecteSelectedEdgeId).subscribe(edgeId => {
      if (edgeId == null) {
        return;
      }

      this.curSelectedEdgeId = edgeId || '';
      this.refreshGraph();
    });

    // Update graph to show nodes with large diffs.
    this.store.select(selectDiffs)
        .pipe(
            filter(diffs => diffs != null),
            withLatestFrom(this.store.select(selectBadNodesThreshold)))
        .subscribe(([diffs, threshold]) => {
          this.curDiffs = diffs;
          this.curThreshold = threshold;
          this.refreshGraph();
        });

    // Zoom and translate graph to locate the given node.
    this.store.select(selectNodeIdToLocate).subscribe(nodeId => {
      if (!nodeId || !nodeId.id) {
        return;
      }

      this.handleLocateNodeId(nodeId.id);
    });

    // Handle threhold update.
    this.store.select(selectBadNodesThreshold).subscribe(threshold => {
      this.curThreshold = threshold;
      this.curBadNodeMeshes = {};
      this.refreshGraph();
    });
  }

  private getLookAt(camera: THREE.Camera): {x: number, y: number, z: number} {
    return Object.assign(new THREE.Vector3(0, 0, -1000)
                             .applyQuaternion(camera.quaternion)
                             .add(camera.position));
  }

  init(container: HTMLElement) {
    this.container = container;

    // Resize graph on container resize.
    const observer = new ResizeObserver(() => {
      this.resizeGraphToMatchContainer();
    });
    observer.observe(this.container);

    // Press space to reset zoom and pan.
    document.addEventListener('keydown', (event) => {
      if (this.paused) {
        return;
      }

      if (event.key === ' ') {
        if (!this.curGraph) {
          return;
        }

        this.curGraph.zoomToFit(300);
      }
    });

    setInterval(() => {
      Object.values(this.curBadNodeMeshes).forEach(mesh => {
        mesh.rotation.y += 0.01;
      });
    }, 10);
  }

  renderGraph(modelGraphLayout: ModelGraphLayout) {
    if (this.curGraph) {
      this.curGraph.graphData({nodes: [], links: []});
      this.curGraph.pauseAnimation();
    }

    this.curNodesMap = {};
    this.curBadNodeMeshes = {};
    modelGraphLayout.nodes.forEach(node => {
      this.curNodesMap[node.id] = node;
    });

    const graphData = {
      nodes: modelGraphLayout.nodes,
      links: modelGraphLayout.edges,
    };

    // Wait for the size to be ready.
    setTimeout(() => {
      const width = this.container.offsetWidth;
      const height = this.container.offsetHeight;
      this.curGraph =
          ForceGraph3D({controlType: 'trackball'})(this.container)
              .width(width)
              .height(height)
              .showNavInfo(false)
              .backgroundColor('white')
              .nodeColor(node => {
                const id = node.id!;
                const nodeData = this.curNodesMap[id];
                if (this.curDiffs &&
                    Math.abs(this.curDiffs[id]) > this.curThreshold) {
                  return '#f02311';
                }

                if (this.curSelectedNodeId === node.id) {
                  return '#fbb829';
                }
                if (this.curHoveredNodeId === node.id) {
                  return '#fdda91';
                }
                if (nodeData.inputNodeIds.length === 0 &&
                    nodeData.op !== 'Const') {
                  return '#79bd9a';
                }
                if (nodeData.outputNodeIds.length === 0) {
                  return '#f9c0ad';
                }
                if (nodeData.op === 'Const') {
                  return '#cccccc';
                }
                return '#6999d5';
              })
              .nodeVal(node => {
                const nodeData = this.curNodesMap[node.id!];
                if (node.id! === this.curSelectedNodeId) {
                  return 6;
                }
                if (nodeData.inputNodeIds.length === 0 &&
                    nodeData.op !== 'Const') {
                  return 7;
                }
                if (nodeData.outputNodeIds.length === 0) {
                  return 7;
                }
                if (nodeData.op === 'Const') {
                  return 0.5;
                }
                return 1;
              })
              .nodeLabel(node => {
                return (node as any).op;
              })
              .nodeOpacity(0.9)
              .nodeResolution(32)
              .nodeThreeObject((node: any) => {
                const id = node.id;
                if (this.curDiffs &&
                    Math.abs(this.curDiffs[id]) > this.curThreshold) {
                  // TODO: Make these colors reusable.
                  let color = 0xf02311;
                  if (id === this.curHoveredNodeId) {
                    color = 0xfdda91;
                  } else if (id === this.curSelectedNodeId) {
                    color = 0xfbb829;
                  }

                  const geometry = new THREE.OctahedronGeometry(20, 1);
                  const meshMaterial = new THREE.MeshPhongMaterial({
                    color,
                    emissive: 0x072534,
                    specular: 0x555555,
                    side: THREE.DoubleSide,
                    flatShading: true
                  });
                  const mesh = new THREE.Mesh(geometry, meshMaterial);

                  this.curBadNodeMeshes[id] = mesh;
                  return mesh;
                }
                // This asks the system to use the default object.
                return undefined as any;
              })
              .onNodeHover((node) => {
                if (node == null) {
                  this.container.style.cursor = 'default';
                  this.curHoveredNodeId = '';
                } else {
                  this.curHoveredNodeId = (node as any).id;
                  this.container.style.cursor = 'pointer';
                }
                this.refreshGraph();
              })
              .onNodeClick((node: any) => {
                const nodeId = node.id;
                if (this.curSelectedNodeId !== nodeId) {
                  this.store.dispatch(setSelectedNodeId({nodeId}));
                } else {
                  this.store.dispatch(setNodeIdToLocate({nodeId}));
                }
              })
              .onNodeDragEnd((node: any) => {
                node.fx = node.x;
                node.fy = node.y;
                node.fz = node.z;
              })
              .onBackgroundClick(() => {
                this.store.dispatch(setSelectedNodeId({nodeId: ''}));
              })
              .linkDirectionalArrowLength(7)
              .linkDirectionalArrowRelPos(1)
              .linkDirectionalArrowColor(ARROW_COLOR)
              .linkHoverPrecision(10)
              .linkColor((link: any) => {
                const edgeId = genEdgeId(link as ModelGraphLayoutEdge);
                if (edgeId === this.curSelectedEdgeId) {
                  return '#fbb829';
                }
                if (edgeId === this.curHoveredEdgeId) {
                  return '#fdda91';
                }
                return LINK_COLOR;
              })
              .linkWidth((link: any) => {
                const edgeId = genEdgeId(link as ModelGraphLayoutEdge);
                if (edgeId === this.curSelectedEdgeId) {
                  return 5;
                }
                if (edgeId === this.curHoveredEdgeId) {
                  return 3;
                }
                return 1;
              })
              .linkOpacity(0.9)
              .onLinkHover((link: any) => {
                if (link == null) {
                  this.container.style.cursor = 'default';
                  this.curHoveredEdgeId = '';
                } else {
                  this.container.style.cursor = 'pointer';
                  this.curHoveredEdgeId =
                      genEdgeId(link as ModelGraphLayoutEdge);
                }
                this.refreshGraph();
              })
              .onLinkClick((link: any) => {
                const edgeId = genEdgeId(link as ModelGraphLayoutEdge);
                this.store.dispatch(setSelectedEdgeId({edgeId}));
              })
              .d3AlphaDecay(0.005)    // default to 0.0228
              .d3VelocityDecay(0.15)  // default to 0.4
              .nodeRelSize(10)
              .graphData(graphData)
              .linkSource('fromNodeId')
              .linkTarget('toNodeId');
    });
  }

  pause() {
    if (!this.curGraph) {
      return;
    }

    this.paused = true;
    this.curGraph.pauseAnimation();
  }

  resume() {
    if (!this.curGraph) {
      return;
    }

    this.paused = false;
    this.curGraph.resumeAnimation();
  }

  private refreshGraph() {
    if (!this.curGraph) {
      return;
    }
    this.curGraph.refresh();
  }

  private handleLocateNodeId(nodeId: string) {
    if (!this.curGraph) {
      return;
    }
    const node = this.curNodesMap[nodeId] as {} as {
      x: number;
      y: number;
      z: number;
    };
    const nodeV3 = new THREE.Vector3(node.x, node.y, node.z);
    const camera = this.curGraph.camera();

    const cameraPos = this.curGraph.cameraPosition();
    const cameraV3 = new THREE.Vector3(cameraPos.x, cameraPos.y, cameraPos.z);
    const curDistance = nodeV3.distanceTo(cameraV3);
    const f = LOCALTE_NODE_DISTANCE / curDistance;
    const newPos = {
      x: node.x + (cameraPos.x - node.x) * f,
      y: node.y + (cameraPos.y - node.y) * f,
      z: node.z + (cameraPos.z - node.z) * f,
    };

    const objToTween = {
      position: cameraPos,
      lookat: this.getLookAt(camera),
    };
    const controls = this.curGraph.controls() as any;
    new TWEEN.Tween(objToTween)
        .to({position: newPos, lookat: node}, 500)
        .easing(TWEEN.Easing.Exponential.InOut)
        .onUpdate(() => {
          camera.position.set(
              objToTween.position.x, objToTween.position.y,
              objToTween.position.z);
          controls.target = new THREE.Vector3(
              objToTween.lookat.x, objToTween.lookat.y, objToTween.lookat.z);
        })
        .start();
  }

  private resizeGraphToMatchContainer() {
    if (!this.container) {
      return;
    }

    const width = this.container.offsetWidth;
    const height = this.container.offsetHeight;
    if (width === 0 || height === 0) {
      return;
    }
    if (this.curGraph) {
      this.curGraph.width(width).height(height);
    }
  }
}
