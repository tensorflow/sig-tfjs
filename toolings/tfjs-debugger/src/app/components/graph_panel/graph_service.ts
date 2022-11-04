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
import {filter} from 'rxjs/operators';
import {CONST_NODE_WIDTH, DEFAULT_BAD_NODE_THRESHOLD, NODE_HEIGHT, NON_CONST_NODE_WIDTH} from 'src/app/common/consts';
import {Diffs, ModelGraphLayout, ModelGraphNode} from 'src/app/data_model/run_results';
import {setSeelctedNodeId} from 'src/app/store/actions';
import {selectDiffs} from 'src/app/store/selectors';
import {AppState} from 'src/app/store/state';
import * as THREE from 'three';
import {preloadFont, Text as ThreeText} from 'troika-three-text';

const DEFAULT_FRUSTUM_SIZE = 500;
const DEFAULT_CAMERA_Y = 50;
const NODE_RECT_CORNER_RADIUS = 6;
const EDGE_TUBE_RADIUS = 0.5;
const EDGE_NUM_SEGMENTATIONS = 64;
const BORDER_WIDTH = 3;
const NODE_Y = 10;
const EDGE_Y = 8;
const NODE_HIGHLIGHTER_ACTIVE_Y = 9;
const NODE_HIGHLIGHTER_INACTIVE_Y = 7;

// Color for "Const" nodes.
const COLOR_CONST_NODE = new THREE.Color(0xcccccc);

// Color for op nodes.
const COLOR_LN_BLUE = new THREE.Color(0x6999d5);

// Color for input nodes.
const COLOR_LN_GREEN = new THREE.Color(0x79bd9a);

// Color for output nodes.
const COLOR_LN_BROWN = new THREE.Color(0xf9c0ad);

// Colod for bad nodes.
const COLOR_BAD_NODE = new THREE.Color(0xf02311);

// Color for highlighter.
const COLOR_INACTIVE_HIGHLIGTER = new THREE.Color(0xffffff);
const COLOR_ACTIVE_HIGHLIGTER = new THREE.Color(0xfdda91);
const COLOR_SELECTED_HIGHLIGTER = new THREE.Color(0xfbb829);

// Material for edges.
const EDGE_MATERIAL = new THREE.MeshBasicMaterial({color: 0xdddddd});

// Material for text.
const CONST_TEXT_MATERIAL = new THREE.MeshBasicMaterial({color: 'black'});
const NON_CONST_TEXT_MATERIAL = new THREE.MeshBasicMaterial({color: 'white'});

// Edges and labels will be hidden when zoom level is below this threshold.
const ZOOM_LEVEL_THRESHOLD_FOR_SHOWING_DETAILS = 0.3;

// Fonts that will be used in the scene.
enum Font {
  GoogleSansMedium = 'assets/GoogleSans-Medium.ttf',
}

// See
// https://protectwise.github.io/troika/troika-three-text/#supported-properties
interface TextProperties {
  // Font and font size are required.
  font: Font;
  fontSize: number;

  // Optional.
  color?: number;              // Default to black
  maxWidth?: number;           // Default to unset
  anchorX?: string;            // Default to 'center'
  anchorY?: string;            // Default to 'middle'
  textAlign?: string;          // Default to 'center'
  whiteSpace?: string;         // Default to 'normal'
  overflowWrap?: string;       // Default to 'break-word'
  lineHeight?: number|string;  // Default to 'normal'
}

interface InstancedMeshInfo {
  instanceId: number;
  instancedMesh: THREE.InstancedMesh;
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
  private constNodeHighlighterInstancedMesh?: THREE.InstancedMesh;
  private nonConstNodeHighlighterInstancedMesh?: THREE.InstancedMesh;
  private dummy = new THREE.Object3D();
  private mousePos = new THREE.Vector2();
  private raycaster = new THREE.Raycaster();
  private prevHighlightedInstanceId = -1;
  private prevInstancedMesh?: THREE.InstancedMesh;
  private nodeIdToInstancedMeshInfo: {[id: string]: InstancedMeshInfo} = {};
  private nonConstInstanceIdToNodeId: {[id: number]: string} = {};
  private constInstanceIdToNodeId: {[id: number]: string} = {};

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
  private activeNodeInfo?: InstancedMeshInfo;
  private selectedNodeInfo?: InstancedMeshInfo;

  private container?: HTMLElement;

  private currentModelGraphLayout?: ModelGraphLayout;

  constructor(
      private readonly store: Store<AppState>,
  ) {
    // Preload fonts for text rendering in the THREE.js scene.
    //
    // This will be done in webworkers without blocking the main UI.
    for (const font of Object.values(Font)) {
      preloadFont(
          {
            font,
            characters: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ' +
                '0123456789'
          },
          () => {});
    }

    // Update graph to show nodes with large diffs.
    this.store.select(selectDiffs)
        .pipe(filter(diffs => diffs != null))
        .subscribe(diffs => {
          this.handleDiffs(diffs!);
        });
  }

  init(container: HTMLElement, canvas: HTMLElement) {
    this.container = container;

    this.setupThreeJs(canvas);
    this.setupPanAndZoom();

    container.addEventListener('mousemove', (e) => {
      this.hanldeMouseMove(e);
    });

    container.addEventListener('click', (e) => {
      this.handleClick(e);
    });
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
          // Don't process zoom related events when the model graph layout has
          // not been loaded.
          if (!this.currentModelGraphLayout) {
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

    // Attach `d3.zoom` to the container.
    //
    // tslint:disable-next-line:no-any
    (view as any).call(this.zoom);

    // Press space to reset zoom and pan.
    document.addEventListener('keydown', (event) => {
      if (event.key === ' ') {
        // Don't handle it when the model graph layout has not been loaded.
        if (!this.currentModelGraphLayout) {
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

    // Figure out which node highlighter mesh instance is under the current
    // mouse cursor, and change it color.
    this.mousePos.x = (e.offsetX / this.container!.offsetWidth) * 2 - 1;
    this.mousePos.y = -(e.offsetY / this.container!.offsetHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mousePos, this.camera);
    const constNodeHighlighterIntersection =
        this.raycaster.intersectObject(this.constNodeHighlighterInstancedMesh!);
    const nonConstNodeHighlighterintersection = this.raycaster.intersectObject(
        this.nonConstNodeHighlighterInstancedMesh!);
    if (constNodeHighlighterIntersection.length > 0 ||
        nonConstNodeHighlighterintersection.length > 0) {
      const instanceId = constNodeHighlighterIntersection.length > 0 ?
          constNodeHighlighterIntersection[0].instanceId :
          nonConstNodeHighlighterintersection[0].instanceId;
      if (instanceId != null && instanceId !== this.prevHighlightedInstanceId) {
        const instancedMesh = constNodeHighlighterIntersection.length > 0 ?
            this.constNodeHighlighterInstancedMesh! :
            this.nonConstNodeHighlighterInstancedMesh!;
        if (!this.isSelectedNode(instanceId, instancedMesh)) {
          this.setHighlighterActive(instancedMesh, instanceId, true);
        }
        if (constNodeHighlighterIntersection.length > 0) {
          this.activeNodeInfo = {
            instancedMesh: this.constNodeHighlighterInstancedMesh!,
            instanceId,
          };
        } else {
          this.activeNodeInfo = {
            instancedMesh: this.nonConstNodeHighlighterInstancedMesh!,
            instanceId,
          };
        }
        if (this.prevHighlightedInstanceId >= 0) {
          this.setHighlighterActive(
              this.prevInstancedMesh!, this.prevHighlightedInstanceId, false);
        }
        this.render();
        this.container!.style.cursor = 'pointer';

        this.prevInstancedMesh = instancedMesh;
        this.prevHighlightedInstanceId = instanceId;
      }
    } else if (this.prevHighlightedInstanceId >= 0 && this.prevInstancedMesh) {
      if (!this.isSelectedNode(
              this.prevHighlightedInstanceId, this.prevInstancedMesh)) {
        this.setHighlighterActive(
            this.prevInstancedMesh, this.prevHighlightedInstanceId, false);
        this.render();
      }
      this.container!.style.cursor = 'default';
      this.activeNodeInfo = undefined;

      this.prevInstancedMesh = undefined;
      this.prevHighlightedInstanceId = -1;
    }
  }

  private isSelectedNode(
      instanceId: number, instancedMesh: THREE.InstancedMesh): boolean {
    return this.selectedNodeInfo != null &&
        this.selectedNodeInfo.instancedMesh === instancedMesh &&
        this.selectedNodeInfo.instanceId === instanceId;
  }

  private setHighlighterActive(
      instancedMesh: THREE.InstancedMesh, index: number, active: boolean) {
    const posY =
        active ? NODE_HIGHLIGHTER_ACTIVE_Y : NODE_HIGHLIGHTER_INACTIVE_Y;
    const color = active ? COLOR_ACTIVE_HIGHLIGTER : COLOR_INACTIVE_HIGHLIGTER;
    this.setInstancedMeshPositionY(instancedMesh, index, posY);
    instancedMesh.setColorAt(index, color);
    instancedMesh.instanceColor!.needsUpdate = true;
  }

  private handleClick(e: MouseEvent) {
    if (!this.nonConstNodesInstancedMesh || !this.constNodesInstancedMesh) {
      return;
    }

    // Unselect the previous node if existed.
    if (this.selectedNodeInfo) {
      this.selectedNodeInfo.instancedMesh.setColorAt(
          this.selectedNodeInfo.instanceId, COLOR_INACTIVE_HIGHLIGTER);
      this.selectedNodeInfo.instancedMesh.instanceColor!.needsUpdate = true;
    }

    // Set current selection.
    if (this.activeNodeInfo) {
      this.activeNodeInfo.instancedMesh.setColorAt(
          this.activeNodeInfo.instanceId, COLOR_SELECTED_HIGHLIGTER);
      this.activeNodeInfo.instancedMesh.instanceColor!.needsUpdate = true;
      this.selectedNodeInfo = {...this.activeNodeInfo};

      let nodeId = '';
      if (this.selectedNodeInfo.instancedMesh ===
          this.constNodeHighlighterInstancedMesh) {
        nodeId = this.constInstanceIdToNodeId[this.selectedNodeInfo.instanceId];
      } else {
        nodeId =
            this.nonConstInstanceIdToNodeId[this.selectedNodeInfo.instanceId];
      }
      this.store.dispatch(setSeelctedNodeId({nodeId}));
    } else {
      this.store.dispatch(setSeelctedNodeId({nodeId: ''}));
    }

    this.render();
  }

  renderGraph(modelGraphLayout: ModelGraphLayout, doneCallbackFn: () => void) {
    this.currentModelGraphLayout = modelGraphLayout;

    if (!this.scene) {
      return;
    }

    this.clearScene();

    // Render nodes.
    let minX = Number.POSITIVE_INFINITY;
    let minZ = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxZ = Number.NEGATIVE_INFINITY;

    // Create instanced mesh for node highlighter. Each instance is a slightly
    // larger rectangle that sits below the actual node rect, and it visually
    // looks like a border around the actual node.
    this.constNodeHighlighterInstancedMesh = this.createNodesInstancedMesh(
        CONST_NODE_WIDTH + BORDER_WIDTH * 2, NODE_HEIGHT + BORDER_WIDTH * 2,
        modelGraphLayout.numConstNodes);
    this.nonConstNodeHighlighterInstancedMesh = this.createNodesInstancedMesh(
        NON_CONST_NODE_WIDTH + BORDER_WIDTH * 2, NODE_HEIGHT + BORDER_WIDTH * 2,
        modelGraphLayout.numNonConstNodes);

    // Create instanced mesh for all const nodes
    this.constNodesInstancedMesh = this.createNodesInstancedMesh(
        CONST_NODE_WIDTH, NODE_HEIGHT, modelGraphLayout.numConstNodes);
    // Store instanceId (index) -> node in mesh's userData.
    this.constNodesInstancedMesh.userData = {};

    // Create instanced mesh for all non-const nodes
    this.nonConstNodesInstancedMesh = this.createNodesInstancedMesh(
        NON_CONST_NODE_WIDTH, NODE_HEIGHT, modelGraphLayout.numNonConstNodes);
    // Store instanceId (index) -> node in mesh's userData.
    this.nonConstNodesInstancedMesh.userData = {};

    let constNodeIndex = 0;
    let nonConstNodeIndex = 0;
    let numSyncedText = 0;
    const nodesMap: {[id: string]: ModelGraphNode} = {};
    this.nodeIdToInstancedMeshInfo = {};
    this.constInstanceIdToNodeId = {};
    this.nonConstInstanceIdToNodeId = {};
    for (const node of modelGraphLayout.nodes) {
      nodesMap[node.id] = node;

      const isConstNode = node.op.toLowerCase() === 'const';

      // Index the instanced mesh info for the node.
      if (isConstNode) {
        this.nodeIdToInstancedMeshInfo[node.id] = {
          instanceId: constNodeIndex,
          instancedMesh: this.constNodesInstancedMesh,
        };
        this.constInstanceIdToNodeId[constNodeIndex] = node.id;
      } else {
        this.nodeIdToInstancedMeshInfo[node.id] = {
          instanceId: nonConstNodeIndex,
          instancedMesh: this.nonConstNodesInstancedMesh,
        };
        this.nonConstInstanceIdToNodeId[nonConstNodeIndex] = node.id;
      }

      // Set colors for highlighter.
      this.constNodeHighlighterInstancedMesh.setColorAt(
          constNodeIndex, COLOR_INACTIVE_HIGHLIGTER);
      this.nonConstNodeHighlighterInstancedMesh.setColorAt(
          nonConstNodeIndex, COLOR_INACTIVE_HIGHLIGTER);

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
      }
      // Output nodes.
      if (node.outputNodeIds.length === 0) {
        this.outputNodes.push(node);
        this.nonConstNodesInstancedMesh.setColorAt(
            nonConstNodeIndex, COLOR_LN_BROWN);
      }
      // TODO: add a plane to make it easy to find input/output nodes.

      // Position each node instance.
      const posX = (node.x || 0) - node.width / 2;
      const posZ = (node.y || 0) + node.height / 2;
      if (isConstNode) {
        this.setInstancedMeshPosition(
            this.constNodesInstancedMesh, constNodeIndex, posX, NODE_Y, posZ);
        this.setInstancedMeshPosition(
            this.constNodeHighlighterInstancedMesh, constNodeIndex,
            posX - BORDER_WIDTH, NODE_HIGHLIGHTER_INACTIVE_Y,
            posZ + BORDER_WIDTH);
        constNodeIndex++;
      } else {
        this.setInstancedMeshPosition(
            this.nonConstNodesInstancedMesh, nonConstNodeIndex, posX, NODE_Y,
            posZ);
        this.setInstancedMeshPosition(
            this.nonConstNodeHighlighterInstancedMesh, nonConstNodeIndex,
            posX - BORDER_WIDTH, NODE_HIGHLIGHTER_INACTIVE_Y,
            posZ + BORDER_WIDTH);
        nonConstNodeIndex++;
      }

      // Add text for op name.
      const opNameText = this.createText(
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
    this.scene.add(this.constNodeHighlighterInstancedMesh);
    this.scene.add(this.nonConstNodeHighlighterInstancedMesh);
    this.scene.add(this.constNodesInstancedMesh);
    this.scene.add(this.nonConstNodesInstancedMesh);
    this.currentMinX = minX;
    this.currentMaxX = maxX;
    this.currentMinZ = minZ;
    this.currentMaxZ = maxZ;

    // Render edges.
    //
    // TODO: render arrows at the end of the edges.
    for (const edge of modelGraphLayout.edges) {
      // For each edge, use its control points to create a curve
      // (CatmullRomCurve3), and render it with a TubeGeometry which we can
      // easily control thickness. With the OrthographicCamera, the tubes look
      // like arrow lines.
      const toNode = nodesMap[edge.toNodeId];
      if (edge.controlPoints.some(
              pt =>
                  pt.x == null || isNaN(pt.x) || pt.y == null || isNaN(pt.y))) {
        continue;
      }
      const controlPointsVectors: THREE.Vector3[] =
          edge.controlPoints.map((pt, index) => {
            // if (index === edge.controlPoints.length - 1) {
            //   return new THREE.Vector3(toNode.x, 0, toNode.y! - NODE_HEIGHT /
            //   2);
            // }
            return new THREE.Vector3(pt.x, 0, pt.y);
          });
      const curve =
          new THREE.CatmullRomCurve3(controlPointsVectors, false, 'chordal');
      const tubeGeometry = new THREE.TubeGeometry(
          curve,
          EDGE_NUM_SEGMENTATIONS,
          EDGE_TUBE_RADIUS,
      );
      const curveObject = new THREE.Mesh(tubeGeometry, EDGE_MATERIAL);
      curveObject.position.y = EDGE_Y;
      this.scene.add(curveObject);
    }

    this.render();
    this.centerModelGraph();
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
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
      this.renderer.setSize(width, height, false);
      this.setCameraFrustum();
    }
  }

  private createNodesInstancedMesh(
      nodeWidth: number, nodeHeight: number,
      count: number): THREE.InstancedMesh {
    const shape = this.createRoundedRectangleShape(
        0, 0, nodeWidth, nodeHeight, NODE_RECT_CORNER_RADIUS);
    const geometry = new THREE.ShapeGeometry(shape);
    geometry.rotateX(-Math.PI / 2);
    return new THREE.InstancedMesh(geometry, undefined, count);
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

  // tslint:disable-next-line:no-any
  private createText(
      content: string, properties: TextProperties,
      material: THREE.Material): any {
    const text = new ThreeText();
    text.text = content;
    text.font = properties.font;
    text.fontSize = properties.fontSize;
    text.material = material;
    // text.color = properties.color || 0x000000;
    text.anchorX = properties.anchorX || 'center';
    text.anchorY = properties.anchorY || 'middle';
    text.textAlign = properties.textAlign || 'center';
    if (properties.maxWidth != null) {
      text.maxWidth = properties.maxWidth;
    }
    text.whiteSpace = properties.whiteSpace || 'normal';
    text.overflowWrap = properties.overflowWrap || 'break-word';
    text.lineHeight = properties.lineHeight || 'normal';

    // Rotate the text to make it facing the camera.
    text.rotateX(-Math.PI / 2);

    return text;
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
    console.log('call count', this.renderer.info.render.calls);
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

  private handleDiffs(diffs: Diffs) {
    Object.keys(diffs).forEach(id => {
      const diff = diffs[id];
      if (diff > DEFAULT_BAD_NODE_THRESHOLD) {
        const instancedMeshInfo = this.nodeIdToInstancedMeshInfo[id];
        if (instancedMeshInfo) {
          instancedMeshInfo.instancedMesh.setColorAt(
              instancedMeshInfo.instanceId, COLOR_BAD_NODE);
          instancedMeshInfo.instancedMesh.instanceColor!.needsUpdate = true;
        }
      }
    });
    this.render();
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
}
