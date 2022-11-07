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

import {Injectable} from '@angular/core';
import {Store} from '@ngrx/store';
import * as d3 from 'd3';
import {filter, skip, withLatestFrom} from 'rxjs/operators';
import {CONST_NODE_WIDTH, NODE_HEIGHT, NON_CONST_NODE_WIDTH} from 'src/app/common/consts';
import {getPctDiffString} from 'src/app/common/utils';
import {Diffs, ModelGraphLayout, ModelGraphLayoutEdge, ModelGraphNode} from 'src/app/data_model/run_results';
import {setSelectedEdgeId, setSelectedNodeId} from 'src/app/store/actions';
import {selectBadNodesThreshold, selectDiffs, selecteSelectedEdgeId, selectNodeIdToLocate, selectSelectedNodeId} from 'src/app/store/selectors';
import {AppState} from 'src/app/store/state';
import * as THREE from 'three';

import {createText, Font, preloadTroikaThreeTextFont} from './utils';

const DEFAULT_FRUSTUM_SIZE = 500;
const DEFAULT_CAMERA_Y = 100;
const NODE_RECT_CORNER_RADIUS = 6;
const EDGE_TUBE_RADIUS = 0.5;
const EDGE_HIGHLIGHTER_TUBE_RADIUS = 1;
const EDGE_NUM_SEGMENTATIONS = 64;
const BORDER_WIDTH = 5;
const NODE_Y = 11;
const EDGE_Y = 8;
const NODE_HIGHLIGHTER_Y = 9;
const NODE_SELECTION_Y = 10;

// Color for "Const" nodes.
const COLOR_CONST_NODE = new THREE.Color(0xcccccc);

// Color for op nodes.
const COLOR_LN_BLUE = new THREE.Color(0x6999d5);

// Color for input nodes.
const COLOR_LN_GREEN = new THREE.Color(0x79bd9a);

// Color for output nodes.
const COLOR_LN_BROWN = new THREE.Color(0xf9c0ad);

// Color for bad nodes.
const COLOR_BAD_NODE = new THREE.Color(0xf02311);

// Color for node/edge hover.
const COLOR_HIGHLIGHTER = new THREE.Color(0xfdda91);

// Color for node/edge selection.
const COLOR_SELECTION = new THREE.Color(0xfbb829);

// Material for hover highlighter.
const HOVER_HIGHLIGHTER_MATERIAL =
    new THREE.MeshBasicMaterial({color: COLOR_HIGHLIGHTER});

// Material for node selection.
const NODE_SELECTION_MATERIAL =
    new THREE.MeshBasicMaterial({color: COLOR_SELECTION});

// Material for edges.
const EDGE_MATERIAL = new THREE.MeshBasicMaterial({color: 0xdddddd});
const EDGE_BG_MATERIAL = new THREE.MeshBasicMaterial({color: 0xffffff});
const EDGE_HIGHLIGHTER_MATERIAL =
    new THREE.MeshBasicMaterial({color: COLOR_HIGHLIGHTER});
const EDGE_SELECTION_MATERIAL =
    new THREE.MeshBasicMaterial({color: COLOR_SELECTION});

// Material for text.
const CONST_TEXT_MATERIAL = new THREE.MeshBasicMaterial({color: 'black'});
const NON_CONST_TEXT_MATERIAL = new THREE.MeshBasicMaterial({color: 'white'});
const BAD_NODE_TEXT_MATERIAL = new THREE.MeshBasicMaterial({color: 0xf02311});

// Edges and labels will be hidden when zoom level is below this threshold.
const ZOOM_LEVEL_THRESHOLD_FOR_SHOWING_DETAILS = 0.3;

enum ObjectType {
  CONST_NODES = 'constNodes',
  NON_CONST_NODES = 'nonConstNodes',
  EDGE = 'edge',
  EDGE_BG = 'edgeBg',
  EDGE_HIGHLIGHTER = 'edgeHighlighter',
  EDGE_SELECTION = 'edgeSelection',
}

interface InstancedMeshInfo {
  instanceId: number;
  instancedMesh: THREE.InstancedMesh;
  color: THREE.Color;
}

/** Handles tasks related to graph rendering. */
@Injectable({
  providedIn: 'root',
})
export class GraphService {
  // THREE.js related.
  private scene?: THREE.Scene;
  private camera?: THREE.OrthographicCamera;
  private renderer?: THREE.WebGLRenderer;
  private constNodesInstancedMesh?: THREE.InstancedMesh;
  private nonConstNodesInstancedMesh?: THREE.InstancedMesh;
  private hoverHighlighterMesh?: THREE.Mesh;
  private nodeSelectionMesh?: THREE.Mesh;
  private edgeHighligterMesh?: THREE.Mesh;
  private edgeSelectionMesh?: THREE.Mesh;
  private dummy = new THREE.Object3D();
  private mousePos = new THREE.Vector2();
  private raycaster = new THREE.Raycaster();
  private nodeIdToInstancedMeshInfo: {[id: string]: InstancedMeshInfo} = {};
  private nonConstInstanceIdToNodeId: {[id: number]: string} = {};
  private constInstanceIdToNodeId: {[id: number]: string} = {};
  private curDiffTextMeshes: THREE.Mesh[] = [];

  // D3 related.
  private zoom = d3.zoom();
  private currentTranslatX = 0;
  private currentTranslatY = 0;
  private currentZoom = 1;

  // Ranges along x and z axis for the current model graph.
  private currentMinX = 0;
  private currentMaxX = 0;
  private currentMinZ = 0;
  private currentMaxZ = 0;

  private inputNodes: ModelGraphNode[] = [];
  private outputNodes: ModelGraphNode[] = [];

  private curHoveredNodeId = '';
  private curSelectedNodeId = '';
  private prevHoveredNodeId = '';

  private curHoveredEdgeId = '';
  private curSelectedEdgeId = '';
  private prevHoveredEdgeId = '';

  private container?: HTMLElement;
  private canvas?: HTMLElement;

  private curDiffs?: Diffs;
  private curModelGraphLayout?: ModelGraphLayout;
  private curNodesMap: {[id: string]: ModelGraphNode} = {};
  private curEdgesMap: {[id: string]: ModelGraphLayoutEdge} = {};

  private paused = false;

  constructor(
      private readonly store: Store<AppState>,
  ) {
    preloadTroikaThreeTextFont();

    // Update graph to show nodes with large diffs.
    this.store.select(selectDiffs)
        .pipe(
            filter(diffs => diffs != null),
            withLatestFrom(this.store.select(selectBadNodesThreshold)))
        .subscribe(([diffs, threshold]) => {
          this.curDiffs = diffs;
          this.handleDiffs(diffs!, threshold);
        });

    // Update graph for threhold changes.
    this.store.select(selectBadNodesThreshold)
        .pipe(skip(1))
        .subscribe(threshold => {
          if (!this.curDiffs) {
            return;
          }
          this.handleDiffs(this.curDiffs, threshold);
        });

    // Update UI for selected node.
    this.store.select(selectSelectedNodeId).subscribe(nodeId => {
      if (nodeId == null) {
        return;
      }

      this.handleSelectedNodeIdUpdated(nodeId);
    });

    // Update UI for selected edge.
    this.store.select(selecteSelectedEdgeId).subscribe(edgeId => {
      if (edgeId == null) {
        return;
      }

      this.handleSelectedEdgeIdUpdated(edgeId);
    });

    // Zoom and translate graph to locate the given node.
    this.store.select(selectNodeIdToLocate).subscribe(nodeId => {
      if (!nodeId || !nodeId.id) {
        return;
      }

      this.handleLocateNodeId(nodeId.id);
    });
  }

  init(container: HTMLElement, canvas: HTMLElement) {
    this.container = container;
    this.canvas = canvas;

    this.setupThreeJs(canvas);
    this.setupPanAndZoom();

    canvas.addEventListener('mousemove', (e) => {
      this.hanldeMouseMove(e);
    });

    canvas.addEventListener('click', (e) => {
      this.handleClick(e);
    });
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
    this.resizeRendererToDisplaySize();
    this.render();
  }

  /** Sets up THREE.js scene with camera, renderer, resize observer, etc. */
  private setupThreeJs(canvas: HTMLElement) {
    if (!this.container) {
      return;
    }

    // Set up THREE.js scene.
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xffffff);

    // Create a camera with orthographic projection.
    //
    // In this projection mode, an object's size in the rendered image stays
    // constant regardless of its distance from the camera. It is suitable for
    // rendering 2D scenes (such as the model graph).
    //
    // Frustum size determines the region of the scene that will appear on the
    // screen (field of view). Larger/Smaller frustum size means more/less stuff
    // to show. To prevent distortion in the final render, the aspect ratio of
    // the frustum size needs to match the content's aspect ratio.
    //
    // In `setupPanAndZoom` below, the frustum size will be used to simulate
    // zooming.
    const aspect = canvas.clientWidth / canvas.clientHeight;
    this.camera = new THREE.OrthographicCamera(
        0,                                  // left
        2 * DEFAULT_FRUSTUM_SIZE * aspect,  // right
        0,                                  // top
        -2 * DEFAULT_FRUSTUM_SIZE,  // bottom. Notice this value needs to be
                                    // negative.
        -DEFAULT_CAMERA_Y * 2,      // near plane,
        DEFAULT_CAMERA_Y * 2,       // far plane
    );
    // The camera is looking down on the x-z plane. The distance between the
    // camera and the x-z plane doesn't matter (due to OrthographicCamera).
    this.camera.position.y = DEFAULT_CAMERA_Y;
    this.camera.lookAt(new THREE.Vector3(0, 0, 0));
    this.camera.updateMatrixWorld();
    this.camera.updateProjectionMatrix();

    // Set up renderer (using WebGL 2 behind the scene).
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      // This will enable performance mode (i.e. use high-performance graphic
      // card) on supported platforms.
      powerPreference: 'high-performance',
      // This will make things (especially thin lines) look better when
      // zoomed out.
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);

    // Render.
    //
    // Note that we don't have an explicit animation loop. We render things
    // on demand (by calling this.render).
    this.render();

    // Resize renderer to match the canvas size when resized.
    const observer = new ResizeObserver(() => {
      // Wrap in RAF for smoothness.
      requestAnimationFrame(() => {
        this.resizeRendererToDisplaySize();
        this.render();
      });
    });
    observer.observe(this.container);
  }

  /**
   * Sets up event handlers for panning and zooming.
   *
   * Here, we are using d3.zoom package which takes care of many low-level
   * setup (e.g. mouse and keyboard events, support for zoom-from-cursor, etc).
   * We use its output (transalteX, translateY, and scale) to update camera's
   * frustum to simluate pan and zoom in the THREE.js scene.
   */
  private setupPanAndZoom() {
    if (!this.container) {
      return;
    }

    const view = d3.select(this.container as Element);

    // Setup drag and zoom
    this.zoom.scaleExtent([0.02, 10])
        .filter((event) => {
          if (this.paused) {
            return false;
          }
          // Don't process zoom related events when the model graph layout has
          // not been loaded.
          if (!this.curModelGraphLayout) {
            return false;
          }

          // By default, d3.zoom uses scrolling to trigger zooming. To make the
          // interactions more intuitive (and to be more consistent with similar
          // software such as Figma), we disable the default behavior (by
          // returning false), and make the scrolling to actually scroll
          // (transalte) the model graph.
          //
          // Note that in d3.zoom, the way to check if zoom is being triggered
          // by scrolling is to check that its event type is 'wheel' and ctrlKey
          // is false.
          if (event.type === 'wheel' && !event.ctrlKey) {
            // Scale scrolling amount by the zoom level to make the experience
            // consistent at different zoom levels.
            const factor = 0.5 / this.currentZoom;
            this.zoom.translateBy(
                view, -Number(event.deltaX) * factor,
                -Number(event.deltaY) * factor);
            this.setCameraFrustum();
            this.render();
            event.preventDefault();
            return false;
          } else if (event.type === 'dblclick') {
            if (this.curSelectedEdgeId) {
              this.fitEdge();
              return false;
            }
          }

          return true;
        })
        .on('zoom', (event) => {
          this.currentZoom = Number(event.transform.k);
          this.currentTranslatX = Number(event.transform.x);
          this.currentTranslatY = Number(event.transform.y);

          // Hide edges and texts when zoom level is below the threshold.
          const belowThreshold =
              this.currentZoom < ZOOM_LEVEL_THRESHOLD_FOR_SHOWING_DETAILS;
          EDGE_MATERIAL.visible = !belowThreshold;
          EDGE_BG_MATERIAL.visible = !belowThreshold;
          CONST_TEXT_MATERIAL.visible = !belowThreshold;
          NON_CONST_TEXT_MATERIAL.visible = !belowThreshold;

          // Wrap in RAF for smoothness.
          requestAnimationFrame(() => {
            if (!this.camera) {
              return;
            }

            this.setCameraFrustum();
            this.render();
          });
        });

    // Use the regular interpolation instead of the default d3.zoomInterpolate
    // which has some unexpected behavior.
    this.zoom.interpolate(d3.interpolate);

    // Attach `d3.zoom` to the container.
    //
    // tslint:disable-next-line:no-any
    (view as any).call(this.zoom);

    // Press space to reset zoom and pan.
    document.addEventListener('keydown', (event) => {
      if (this.paused) {
        return;
      }

      if (event.key === ' ') {
        // Don't handle it when the model graph layout has not been loaded.
        if (!this.curModelGraphLayout) {
          return;
        }

        const element = event.target as HTMLElement;

        // Don't trigger it when the current focus is in any input element.
        const isInputElement = element.tagName === 'INPUT' ||
            element.tagName === 'SELECT' || element.tagName === 'TEXTAREA' ||
            element.contentEditable === 'true';
        if (isInputElement) {
          return;
        }

        // Reset the graph.
        this.currentTranslatX = 0;
        this.currentTranslatY = 0;
        this.currentZoom = 1;
        this.centerModelGraph(200);
      }
    });
  }

  private hanldeMouseMove(e: MouseEvent) {
    if (!this.nonConstNodesInstancedMesh || !this.camera ||
        !this.constNodesInstancedMesh) {
      return;
    }

    // Find the node/edge under the mouse curosr using ray casting.
    this.mousePos.x = (e.offsetX / this.container!.offsetWidth) * 2 - 1;
    this.mousePos.y = -(e.offsetY / this.container!.offsetHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mousePos, this.camera);

    const intersections = this.raycaster.intersectObject(this.scene!);
    const nodeIntersections = intersections.filter(intersect => {
      const type = intersect.object.userData['type'];
      return type === ObjectType.CONST_NODES ||
          type === ObjectType.NON_CONST_NODES;
    });
    if (nodeIntersections.length > 0) {
      const intersection = nodeIntersections[0];
      const intersectWithConstNode =
          intersection.object === this.constNodesInstancedMesh;
      const instanceId = intersection.instanceId!;
      const instanceIdToNodeId = intersectWithConstNode ?
          this.constInstanceIdToNodeId :
          this.nonConstInstanceIdToNodeId;
      const hoveredNodeId = instanceIdToNodeId[instanceId];
      if (hoveredNodeId !== this.prevHoveredNodeId) {
        this.prevHoveredNodeId = hoveredNodeId;
        this.curHoveredNodeId = hoveredNodeId;
        this.showNodeHighlighter(this.curHoveredNodeId);
        this.render();
        this.container!.style.cursor = 'pointer';
      }
    } else if (this.prevHoveredNodeId) {
      this.removeNodeHighlighter();
      this.curHoveredNodeId = '';
      this.prevHoveredNodeId = '';
      this.render();
      this.container!.style.cursor = 'default';
    }

    const edgeIntersections = intersections.filter(intersect => {
      const type = intersect.object.userData['type'];
      return type === ObjectType.EDGE_BG;
    });
    if (edgeIntersections.length > 0) {
      const edge =
          edgeIntersections[0].object.userData['edge'] as ModelGraphLayoutEdge;
      const edgeId = this.edgeId(edge);
      if (edgeId !== this.prevHoveredEdgeId) {
        this.prevHoveredEdgeId = edgeId;
        this.curHoveredEdgeId = edgeId;
        this.showEdgeHighlighter(edge);
        this.render();
        this.container!.style.cursor = 'pointer';
      }
    } else if (this.prevHoveredEdgeId) {
      this.removeEdgeHighlighter();
      this.prevHoveredEdgeId = '';
      this.curHoveredEdgeId = '';
      this.render();
      this.container!.style.cursor = 'default';
    }
  }

  private showNodeHighlighter(nodeId: string) {
    if (!this.curModelGraphLayout) {
      return;
    }

    this.removeNodeHighlighter();

    const node = this.curNodesMap[nodeId];
    const geometry = this.createRoundedRectGeometry(
        node.width + BORDER_WIDTH * 2, node.height + BORDER_WIDTH * 2,
        NODE_RECT_CORNER_RADIUS + 4);
    this.hoverHighlighterMesh =
        new THREE.Mesh(geometry, HOVER_HIGHLIGHTER_MATERIAL);
    this.hoverHighlighterMesh.position.set(
        node.x! - node.width / 2 - BORDER_WIDTH, NODE_HIGHLIGHTER_Y,
        node.y! + node.height / 2 + BORDER_WIDTH);
    this.scene!.add(this.hoverHighlighterMesh);
  }

  private removeNodeHighlighter() {
    if (this.hoverHighlighterMesh) {
      this.scene!.remove(this.hoverHighlighterMesh);
      this.hoverHighlighterMesh.geometry.dispose();
      this.hoverHighlighterMesh = undefined;
    }
  }

  private showNodeSelection(nodeId: string) {
    if (!this.curModelGraphLayout) {
      return;
    }

    this.removeNodeSelection();

    const node = this.curNodesMap[nodeId];
    const geometry = this.createRoundedRectGeometry(
        node.width + BORDER_WIDTH * 2, node.height + BORDER_WIDTH * 2,
        NODE_RECT_CORNER_RADIUS + 4);
    this.nodeSelectionMesh = new THREE.Mesh(geometry, NODE_SELECTION_MATERIAL);
    this.nodeSelectionMesh.position.set(
        node.x! - node.width / 2 - BORDER_WIDTH, NODE_SELECTION_Y,
        node.y! + node.height / 2 + BORDER_WIDTH);
    this.scene!.add(this.nodeSelectionMesh);
  }

  private removeNodeSelection() {
    if (this.nodeSelectionMesh) {
      this.scene!.remove(this.nodeSelectionMesh);
      this.nodeSelectionMesh.geometry.dispose();
      this.nodeSelectionMesh = undefined;
    }
  }

  private showEdgeHighlighter(edge: ModelGraphLayoutEdge) {
    this.removeEdgeHighlighter();

    this.edgeHighligterMesh = this.createEdge(
        edge, EDGE_HIGHLIGHTER_MATERIAL, EDGE_HIGHLIGHTER_TUBE_RADIUS,
        EDGE_Y + 1, ObjectType.EDGE_HIGHLIGHTER);
    this.scene!.add(this.edgeHighligterMesh);
  }

  private removeEdgeHighlighter() {
    if (this.edgeHighligterMesh) {
      this.scene!.remove(this.edgeHighligterMesh);
      this.edgeHighligterMesh.geometry.dispose();
      this.edgeHighligterMesh = undefined;
    }
  }

  private showEdgeSelection(edgeId: string) {
    if (!this.curModelGraphLayout) {
      return;
    }

    this.removeEdgeSelection();
    const edge = this.curEdgesMap[edgeId];
    this.edgeSelectionMesh = this.createEdge(
        edge, EDGE_SELECTION_MATERIAL, EDGE_HIGHLIGHTER_TUBE_RADIUS, EDGE_Y + 1,
        ObjectType.EDGE_SELECTION);
    this.scene!.add(this.edgeSelectionMesh);
  }

  private removeEdgeSelection() {
    if (this.edgeSelectionMesh) {
      this.scene!.remove(this.edgeSelectionMesh);
      this.edgeSelectionMesh.geometry.dispose();
      this.edgeSelectionMesh = undefined;
    }
  }

  private handleClick(e: MouseEvent) {
    if (!this.nonConstNodesInstancedMesh || !this.constNodesInstancedMesh) {
      return;
    }

    this.store.dispatch(setSelectedNodeId({nodeId: this.curHoveredNodeId}));
    this.store.dispatch(setSelectedEdgeId({edgeId: this.curHoveredEdgeId}));
  }

  renderGraph(modelGraphLayout: ModelGraphLayout, doneCallbackFn: () => void) {
    this.curModelGraphLayout = modelGraphLayout;

    if (!this.scene) {
      return;
    }

    this.clearScene();

    // Render nodes.
    let minX = Number.POSITIVE_INFINITY;
    let minZ = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxZ = Number.NEGATIVE_INFINITY;

    // Create instanced mesh for all const nodes
    this.constNodesInstancedMesh = this.createNodesInstancedMesh(
        CONST_NODE_WIDTH, NODE_HEIGHT, modelGraphLayout.numConstNodes);
    this.constNodesInstancedMesh.userData = {'type': ObjectType.CONST_NODES};

    // Create instanced mesh for all non-const nodes
    this.nonConstNodesInstancedMesh = this.createNodesInstancedMesh(
        NON_CONST_NODE_WIDTH, NODE_HEIGHT, modelGraphLayout.numNonConstNodes);
    // Store instanceId (index) -> node in mesh's userData.
    this.nonConstNodesInstancedMesh.userData = {
      'type': ObjectType.NON_CONST_NODES
    };

    let constNodeIndex = 0;
    let nonConstNodeIndex = 0;
    let numSyncedText = 0;
    this.curNodesMap = {};
    this.nodeIdToInstancedMeshInfo = {};
    this.constInstanceIdToNodeId = {};
    this.nonConstInstanceIdToNodeId = {};
    for (const node of modelGraphLayout.nodes) {
      this.curNodesMap[node.id] = node;

      const isConstNode = node.op.toLowerCase() === 'const';

      // Index the instanced mesh info for the node.
      if (isConstNode) {
        this.nodeIdToInstancedMeshInfo[node.id] = {
          instanceId: constNodeIndex,
          instancedMesh: this.constNodesInstancedMesh,
          color: COLOR_CONST_NODE,
        };
        this.constInstanceIdToNodeId[constNodeIndex] = node.id;
      } else {
        this.nodeIdToInstancedMeshInfo[node.id] = {
          instanceId: nonConstNodeIndex,
          instancedMesh: this.nonConstNodesInstancedMesh,
          color: COLOR_LN_BLUE,
        };
        this.nonConstInstanceIdToNodeId[nonConstNodeIndex] = node.id;
      }

      // Set colors for const nodes.
      this.constNodesInstancedMesh.setColorAt(constNodeIndex, COLOR_CONST_NODE);

      // Set colors for non-const nodes.
      this.nonConstNodesInstancedMesh.setColorAt(
          nonConstNodeIndex, COLOR_LN_BLUE);

      // Set special colors for input and output nodes.
      //
      // Input nodes.
      if (node.inputNodeIds.length === 0 && node.op.toLowerCase() !== 'const') {
        this.inputNodes.push(node);
        this.nonConstNodesInstancedMesh.setColorAt(
            nonConstNodeIndex, COLOR_LN_GREEN);
        this.nodeIdToInstancedMeshInfo[node.id].color = COLOR_LN_GREEN;
      }
      // Output nodes.
      if (node.outputNodeIds.length === 0) {
        this.outputNodes.push(node);
        this.nonConstNodesInstancedMesh.setColorAt(
            nonConstNodeIndex, COLOR_LN_BROWN);
        this.nodeIdToInstancedMeshInfo[node.id].color = COLOR_LN_BROWN;
      }
      // TODO: add a plane to make it easy to find input/output nodes.

      // Position each node instance.
      const posX = (node.x || 0) - node.width / 2;
      const posZ = (node.y || 0) + node.height / 2;
      if (isConstNode) {
        this.setInstancedMeshPosition(
            this.constNodesInstancedMesh, constNodeIndex, posX, NODE_Y, posZ);
        constNodeIndex++;
      } else {
        this.setInstancedMeshPosition(
            this.nonConstNodesInstancedMesh, nonConstNodeIndex, posX, NODE_Y,
            posZ);
        nonConstNodeIndex++;
      }

      // Add text for op name.
      const opNameText = createText(
          node.op, {
            font: Font.GoogleSansMedium,
            fontSize: node.op.length > 15 ? 8 : 11,
            maxWidth: node.width - 4,
            lineHeight: 1,
          },
          isConstNode ? CONST_TEXT_MATERIAL : NON_CONST_TEXT_MATERIAL);
      opNameText.position.set(node.x || 0, 20, node.y || 0);
      this.scene.add(opNameText);
      // Wait for all texts are ready (happens in web workers) then render them.
      opNameText.sync(() => {
        numSyncedText++;
        if (numSyncedText === modelGraphLayout.nodes.length) {
          this.render();
          doneCallbackFn();
        }
      });

      // Update graph's range.
      minX = Math.min(minX, posX);
      maxX = Math.max(maxX, posX + node.width);
      minZ = Math.min(minZ, posZ);
      maxZ = Math.max(maxZ, posZ + node.height);
    }
    this.scene.add(this.constNodesInstancedMesh);
    this.scene.add(this.nonConstNodesInstancedMesh);
    this.currentMinX = minX;
    this.currentMaxX = maxX;
    this.currentMinZ = minZ;
    this.currentMaxZ = maxZ;

    // Render edges.
    //
    // TODO: render arrows at the end of the edges.
    this.curEdgesMap = {};
    for (const edge of modelGraphLayout.edges) {
      this.curEdgesMap[this.edgeId(edge)] = edge;
      this.scene.add(this.createEdge(
          edge, EDGE_BG_MATERIAL, EDGE_TUBE_RADIUS * 10, 1,
          ObjectType.EDGE_BG));
      this.scene.add(this.createEdge(edge, EDGE_MATERIAL, EDGE_TUBE_RADIUS));
    }

    this.render();
    this.centerModelGraph();
  }

  private createEdge(
      edge: ModelGraphLayoutEdge, material: THREE.Material, width: number,
      posY: number = EDGE_Y, type: ObjectType = ObjectType.EDGE): THREE.Mesh {
    // For each edge, use its control points to create a curve
    // (CatmullRomCurve3), and render it with a TubeGeometry which we can
    // easily control thickness. With the OrthographicCamera, the tubes look
    // like arrow lines.
    const controlPointsVectors: THREE.Vector3[] =
        edge.controlPoints.map((pt, index) => {
          return new THREE.Vector3(pt.x, 0, pt.y);
        });
    const curve =
        new THREE.CatmullRomCurve3(controlPointsVectors, false, 'chordal');
    const tubeGeometry = new THREE.TubeGeometry(
        curve,
        EDGE_NUM_SEGMENTATIONS,
        width,
    );
    const curveObject = new THREE.Mesh(tubeGeometry, material);
    curveObject.userData = {'type': type, 'edge': edge};
    curveObject.position.y = posY;
    return curveObject;
  }

  private setCameraFrustum() {
    if (!this.camera || !this.container) {
      return;
    }

    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    const aspect = width / height;

    // Without going into too much detail, the following code maps the d3.zoom's
    // translation and scale level to camera's frustum area.
    //
    // Code reference: http://bl.ocks.org/nitaku/b25e6f091e97667c6cae
    const x = this.currentTranslatX - width / 2;
    const y = this.currentTranslatY - height / 2;
    this.camera.left = -DEFAULT_FRUSTUM_SIZE / this.currentZoom * aspect -
        x / width * 2 * DEFAULT_FRUSTUM_SIZE / this.currentZoom * aspect;
    this.camera.right = DEFAULT_FRUSTUM_SIZE / this.currentZoom * aspect -
        x / width * 2 * DEFAULT_FRUSTUM_SIZE / this.currentZoom * aspect;
    this.camera.top = DEFAULT_FRUSTUM_SIZE / this.currentZoom +
        y * DEFAULT_FRUSTUM_SIZE / this.currentZoom / height * 2;
    this.camera.bottom = -DEFAULT_FRUSTUM_SIZE / this.currentZoom +
        y * DEFAULT_FRUSTUM_SIZE / this.currentZoom / height * 2;
    this.camera.updateProjectionMatrix();
  }

  private resizeRendererToDisplaySize() {
    if (!this.renderer || !this.camera || !this.container) {
      return;
    }

    const canvas = this.renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width === 0 || height === 0) {
      return;
    }
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
      this.renderer.setSize(width, height, false);
      this.setCameraFrustum();
    }
  }

  private createNodesInstancedMesh(
      nodeWidth: number, nodeHeight: number,
      count: number): THREE.InstancedMesh {
    return new THREE.InstancedMesh(
        this.createRoundedRectGeometry(nodeWidth, nodeHeight), undefined,
        count);
  }

  private createRoundedRectGeometry(
      nodeWidth: number, nodeHeight: number,
      radius = NODE_RECT_CORNER_RADIUS): THREE.ShapeGeometry {
    const shape =
        this.createRoundedRectangleShape(0, 0, nodeWidth, nodeHeight, radius);
    const geometry = new THREE.ShapeGeometry(shape);
    geometry.rotateX(-Math.PI / 2);
    return geometry;
  }

  private createRoundedRectangleShape(
      x: number, y: number, width: number, height: number,
      radius: number): THREE.Shape {
    const roundedRectShape = new THREE.Shape();
    roundedRectShape.moveTo(x, y + radius);
    roundedRectShape.lineTo(x, y + height - radius);
    roundedRectShape.quadraticCurveTo(x, y + height, x + radius, y + height);
    roundedRectShape.lineTo(x + width - radius, y + height);
    roundedRectShape.quadraticCurveTo(
        x + width, y + height, x + width, y + height - radius);
    roundedRectShape.lineTo(x + width, y + radius);
    roundedRectShape.quadraticCurveTo(x + width, y, x + width - radius, y);
    roundedRectShape.lineTo(x + radius, y);
    roundedRectShape.quadraticCurveTo(x, y, x, y + radius);
    return roundedRectShape;
  }

  private clearScene() {
    if (!this.scene) {
      return;
    }

    // Remove all meshes from the scene and dispose their geometries and
    // materials.
    while (this.scene.children.length > 0) {
      const obj = this.scene.children[0] as THREE.Mesh;
      if (obj.geometry) {
        obj.geometry.dispose();
      }
      if (obj.material) {
        (obj.material as THREE.Material).dispose();
      }
      this.scene.remove(obj);
    }

    // Reset states.
    this.inputNodes = [];
    this.outputNodes = [];
    this.currentTranslatX = 0;
    this.currentTranslatY = 0;
    this.currentZoom = 1;
    this.setCameraFrustum();
  }

  private render() {
    if (!this.renderer || !this.scene || !this.camera) {
      return;
    }
    this.renderer.render(this.scene, this.camera);
    // console.log('call count', this.renderer.info.render.calls);
  }

  private centerModelGraph(transitionDuration = 0) {
    if (!this.container) {
      return;
    }

    // Calculate scale level.
    //
    // If the graph is wider than the container, use the widths to calculate the
    // scale. Otherwise, use the heights
    //
    // Also clamp the scale level so nodes are not too small or too big.
    const graphWidth = this.currentMaxX - this.currentMinX;
    const graphHeight = this.currentMaxZ - this.currentMinZ;
    const graphAspect = graphWidth / graphHeight;
    const containerWidth = this.container.clientWidth;
    const containerHeight = this.container.clientHeight;
    const containerAspect =
        this.container.clientWidth / this.container.clientHeight;
    let scale = graphAspect > containerAspect ?
        (this.container.clientWidth / graphWidth) :
        (this.container.clientHeight / graphHeight);
    scale = Math.max(0.4, Math.min(scale, 1));

    // Translate the graph so that:
    //
    // - The top of the graph aligns with the top of the screen.
    // - The center of all *input nodes* is at the center of the screen.
    let inputNodesMidXSum = 0;
    let minInputNodeY = 0;
    for (const node of this.inputNodes) {
      inputNodesMidXSum += (node.x || 0);
      minInputNodeY = Math.min(minInputNodeY, (node.y || 0) - node.height);
    }
    const inputNodesMidX = inputNodesMidXSum / this.inputNodes.length;

    // Apply transform (translation + scale) through d3.zoom.
    const aspect = containerWidth / containerHeight;
    const targetCameraLeft =
        (-2 * DEFAULT_FRUSTUM_SIZE * aspect / 2 / scale + inputNodesMidX);
    const transform = d3.zoomIdentity.scale(scale).translate(
        this.cameraLeftToD3Translate(targetCameraLeft),
        // 0,
        minInputNodeY + 30);
    const view = d3.select(this.container as Element);
    if (transitionDuration === 0) {
      // tslint:disable-next-line:no-any
      (view as any).call(this.zoom.transform, transform);
    } else {
      view.transition()
          .duration(transitionDuration)
          .call(this.zoom.transform, transform);
    }
  }

  private handleDiffs(diffs: Diffs, threshold: number) {
    // Reset.
    this.removeDiffTexts();
    Object.values(this.nodeIdToInstancedMeshInfo).forEach(info => {
      info.instancedMesh.setColorAt(info.instanceId, info.color);
      info.instancedMesh.instanceColor!.needsUpdate = true;
    });

    Object.keys(diffs).forEach(id => {
      const diff = diffs[id];
      if (Math.abs(diff) > threshold) {
        const instancedMeshInfo = this.nodeIdToInstancedMeshInfo[id];
        if (instancedMeshInfo) {
          instancedMeshInfo.instancedMesh.setColorAt(
              instancedMeshInfo.instanceId, COLOR_BAD_NODE);
          instancedMeshInfo.instancedMesh.instanceColor!.needsUpdate = true;
        }

        const node = this.curNodesMap[id];
        const diffText = createText(
            getPctDiffString(diff), {
              font: Font.GoogleSansMedium,
              fontSize: 8,
              lineHeight: 1,
              anchorX: 'right',
            },
            BAD_NODE_TEXT_MATERIAL);
        diffText.position.set(
            node.x! + node.width / 2, 20,
            node.y! + node.height / 2 + BORDER_WIDTH + 6);
        this.scene!.add(diffText);
        diffText.sync(() => {
          this.render();
        });
        this.curDiffTextMeshes.push(diffText);
      }
    });
    this.render();
  }

  private removeDiffTexts() {
    this.curDiffTextMeshes.forEach(mesh => {
      mesh.geometry.dispose();
      this.scene!.remove(mesh);
    });
    this.curDiffTextMeshes = [];
  }

  private handleSelectedNodeIdUpdated(nodeId: string) {
    // Unselect the previous node if existed.
    if (this.curSelectedNodeId) {
      this.curSelectedNodeId = '';
      this.removeNodeSelection();
    }

    this.curSelectedNodeId = nodeId;
    if (this.curSelectedNodeId) {
      this.showNodeSelection(this.curSelectedNodeId);
    } else {
      this.removeNodeSelection();
    }
    this.render();
  }

  private handleLocateNodeId(nodeId: string) {
    this.locateNode(nodeId, 400);
  }

  private handleSelectedEdgeIdUpdated(edgeId: string) {
    // Unselect the previous node if existed.
    if (this.curSelectedEdgeId) {
      this.curSelectedEdgeId = '';
      this.removeEdgeSelection();
    }

    this.curSelectedEdgeId = edgeId;
    if (this.curSelectedEdgeId) {
      this.showEdgeSelection(this.curSelectedEdgeId);
    } else {
      this.removeEdgeSelection();
    }
    this.render();
  }

  private locateNode(nodeId: string, transitionDuration = 0) {
    if (!this.container) {
      return;
    }

    this.currentTranslatX = 0;
    this.currentTranslatY = 0;
    this.currentZoom = 1;

    const scale = 1.5;
    const node = this.curNodesMap[nodeId];
    const x = node.x!;
    const y = node.y!;

    this.centerViewAt(x, y, scale, transitionDuration);
  }

  fitEdge() {
    if (!this.curSelectedEdgeId || !this.container) {
      return;
    }

    this.currentTranslatX = 0;
    this.currentTranslatY = 0;
    this.currentZoom = 1;

    const [fromNodeId, toNodeId] = this.curSelectedEdgeId.split('___');
    const fromNode = this.curNodesMap[fromNodeId];
    const toNode = this.curNodesMap[toNodeId];
    const x = (fromNode.x! + toNode.x!) / 2;
    const y = (fromNode.y! + toNode.y!) / 2;
    const w = Math.max(fromNode.x! + fromNode.width, toNode.x! + toNode.width) -
        Math.min(fromNode.x!, toNode.x!);
    const h =
        Math.max(fromNode.y! + fromNode.height, toNode.y! + toNode.height) -
        Math.min(fromNode.y!, toNode.y!);
    const areaAspect = w / h;
    const containerAspect =
        this.container.clientWidth / this.container.clientHeight;
    let scale = areaAspect > containerAspect ?
        (this.container.clientWidth / w) :
        (this.container.clientHeight / h);
    scale = Math.max(0.02, Math.min(scale, 1.5));

    this.centerViewAt(x, y, scale);
  }

  private centerViewAt(
      centerX: number, centerY: number, scale: number,
      transitionDuration = 400) {
    if (!this.container) {
      return;
    }

    const containerWidth = this.container.clientWidth;
    const containerHeight = this.container.clientHeight;

    // Apply transform (translation + scale) through d3.zoom.
    const aspect = containerWidth / containerHeight;
    const targetCameraLeft =
        (-2 * DEFAULT_FRUSTUM_SIZE * aspect / 2 / scale + centerX);
    const targetCameraTop = -centerY + DEFAULT_FRUSTUM_SIZE / scale;
    const transform = d3.zoomIdentity.scale(scale).translate(
        this.cameraLeftToD3Translate(targetCameraLeft),
        this.cameraTopToD3Translate(targetCameraTop));
    const view = d3.select(this.container as Element);
    if (transitionDuration === 0) {
      // tslint:disable-next-line:no-any
      (view as any).call(this.zoom.transform, transform);
    } else {
      view.transition()
          .duration(transitionDuration)
          .ease(d3.easeExpInOut)
          .call(this.zoom.transform, transform);
    }
  }

  private cameraLeftToD3Translate(targetCameraLeft: number): number {
    if (!this.container) {
      return 0;
    }

    // The following is the reverse of the calculations in `setCameraFrustum`
    // above.
    const containerWidth = this.container.clientWidth;
    const aspect = containerWidth / this.container.clientHeight;

    return targetCameraLeft /
        (DEFAULT_FRUSTUM_SIZE / this.currentZoom * aspect) / -2 *
        containerWidth;
  }

  private cameraTopToD3Translate(targetCameraTop: number): number {
    if (!this.container) {
      return 0;
    }

    const containerHeight = this.container.clientHeight;
    return targetCameraTop * this.currentZoom * containerHeight /
        DEFAULT_FRUSTUM_SIZE / 2;
    // const x = this.currentTranslatX - width / 2;
    // const y = this.currentTranslatY - height / 2;
    // this.camera.left = -DEFAULT_FRUSTUM_SIZE / this.currentZoom * aspect -
    //     x / width * 2 * DEFAULT_FRUSTUM_SIZE / this.currentZoom * aspect;
    // this.camera.right = DEFAULT_FRUSTUM_SIZE / this.currentZoom * aspect -
    //     x / width * 2 * DEFAULT_FRUSTUM_SIZE / this.currentZoom * aspect;
    // this.camera.top = DEFAULT_FRUSTUM_SIZE / this.currentZoom +
    //     y * DEFAULT_FRUSTUM_SIZE / this.currentZoom / height * 2;
  }

  private setInstancedMeshPosition(
      instancedMesh: THREE.InstancedMesh, index: number, x: number, y: number,
      z: number) {
    this.dummy.position.set(x, y, z);
    this.dummy.updateMatrix();
    instancedMesh.setMatrixAt(index, this.dummy.matrix);
    instancedMesh.instanceMatrix.needsUpdate = true;
  }

  private setInstancedMeshPositionY(
      instancedMesh: THREE.InstancedMesh, index: number, y: number) {
    const curMatrix = new THREE.Matrix4();
    instancedMesh.getMatrixAt(index, curMatrix);
    const elements = curMatrix.toArray();
    curMatrix.setPosition(elements[12], y, elements[14]);
    instancedMesh.setMatrixAt(index, curMatrix);
    instancedMesh.instanceMatrix.needsUpdate = true;
  }

  private edgeId(edge: ModelGraphLayoutEdge): string {
    return `${edge.fromNodeId}___${edge.toNodeId}`;
  }
}
