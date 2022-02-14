import * as d3 from 'd3';
import {ModelGraph, ModelGraphLayout} from 'src/app/data_model/run_results';
import * as THREE from 'three';
import {Material, Object3D, Side, Vector3} from 'three';
import {preloadFont, Text as ThreeText} from 'troika-three-text';

const DEFAULT_FRUSTUM_SIZE = 500;
const DEFAULT_CAMERA_Y = 50;
const NODE_RECT_CORNER_RADIUS = 6;
const EDGE_TUBE_RADIUS = 1;
const EDGE_NUM_SEGMENTATIONS = 16;

// Material for "Const" nodes.
const CONST_NODE_MATERIAL = new THREE.MeshBasicMaterial({color: 0xcccccc});

// Material for non-const nodes.
const LN_BLUE = 0x8399be;
const NON_CONST_NODE_MATERIAL = new THREE.MeshBasicMaterial({color: LN_BLUE});

// Material for edges.
const EDGE_MATERIAL = new THREE.MeshBasicMaterial({color: 0xdddddd});

// Fonts that can be used in the scene.
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
  overflowWrap?: string;       //  Default to 'break-word'
  lineHeight?: number|string;  // Default to 'normal'
}

/** Handles tasks related to graph rendering. */
export class GraphService {
  private scene?: THREE.Scene;
  private camera?: THREE.OrthographicCamera;
  private renderer?: THREE.WebGLRenderer;

  private zoom = d3.zoom();
  private currentTranslatX = 0;
  private currentTranslatY = 0;
  private currentZoom = 1;

  // Ranges along x and z axis for the current model graph.
  private currentMinX = 0;
  private currentMaxX = 0;
  private currentMinZ = 0;
  private currentMaxZ = 0;

  private container?: HTMLElement;

  constructor() {
    // Preload fonts for text rendering in the THREE.js scene.
    for (const font of Object.values(Font)) {
      preloadFont(
          {
            font,
            characters: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ' +
                '0123456789'
          },
          () => {});
    }
  }

  /** Sets up THREE.js scene with camera, renderer, resize observer, etc. */
  setupThreeJs(container: HTMLElement, canvas: HTMLElement) {
    this.container = container;

    // Set up THREE.js scene.
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xffffff);

    // Create a camera with orthographic projection.
    //
    // In this projection mode, an object's size in the rendered image stays
    // constant regardless of its distance from the camera. It is suitable for
    // 2D scenes (such as model graph).
    //
    // Frustum size determines the region of the scene that will appear on the
    // screen (field of view). Larger/Smaller frustum size means more/less stuff
    // to show. It will be used in related code to simulate camera's zoom level.
    const aspect = canvas.clientWidth / canvas.clientHeight;
    this.camera = new THREE.OrthographicCamera(
        0, 2 * DEFAULT_FRUSTUM_SIZE * aspect, 0, -2 * DEFAULT_FRUSTUM_SIZE,
        -DEFAULT_CAMERA_Y * 2 /* near plain */,
        DEFAULT_CAMERA_Y * 2 /* far plain */);
    this.camera.position.y = DEFAULT_CAMERA_Y;
    this.camera.lookAt(new THREE.Vector3(0, 0, 0));
    this.camera.updateMatrixWorld();
    this.camera.updateProjectionMatrix();

    // Set up renderer (WebGL 2).
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      powerPreference: 'high-performance',
      // This will make things look better when zoomed out.
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);

    // Render.
    this.render();

    // Resize renderer to match the canvas size when it is resized.
    const observer = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        this.resizeRendererToDisplaySize();
        this.render();
      });
    });
    observer.observe(container);
  }

  /**
   * Sets up event handlers for panning (drag the canvas) and zooming
   * (mousewheel).
   */
  setupPanAndZoom() {
    if (!this.container) {
      return;
    }

    const view = d3.select(this.container as Element);

    // Setup drag and zoom
    this.zoom.scaleExtent([0.02, 10])
        .filter((event) => {
          // By default, d3.zoom uses scrolling to trigger zooming. To make the
          // interactions more intuitive (and to be more consistent with similar
          // software suvh as Figma), we disable the default behavior (by
          // returning false), and make the scrolling to actually scroll
          // (transalte) the model graph.
          //
          // Note that in d3.zoom, the way to check if scrolling is being
          // triggered is to check that its type is 'wheel' and ctrlKey is
          // false.
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
          requestAnimationFrame(() => {
            if (!this.camera) {
              return;
            }

            this.currentZoom = Number(event.transform.k);
            this.currentTranslatX = Number(event.transform.x);
            this.currentTranslatY = Number(event.transform.y);

            this.setCameraFrustum();
            this.render();
          });
        });
    // tslint:disable-next-line:no-any
    (view as any).call(this.zoom);
  }

  renderGraph(modelGraphLayout: ModelGraphLayout) {
    if (!this.scene) {
      return;
    }

    this.clearScene();
    console.log('rendering ', modelGraphLayout);

    // Render nodes.
    // FIXME: zoom out to show all after rendering
    // FIXME: click space to fit zoom.
    // FIXME: use different colors for input and output nodes.
    // FIXME: use up/down/left/right and a/w/s/d to pan graph. Show these
    // buttons at the corner of canvas.

    let minX = Number.POSITIVE_INFINITY;
    let minZ = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxZ = Number.NEGATIVE_INFINITY;
    for (const node of modelGraphLayout.nodes) {
      // Create a ShapeGeometry with its shape (rounded rectangle).
      const nodeShape = this.createRoundedRectangleShape(
          0, 0, node.width, node.height, NODE_RECT_CORNER_RADIUS);
      const geometry = new THREE.ShapeGeometry(nodeShape);

      // Create a mesh with the geometry.
      const isConstNodde = node.op.toLowerCase() === 'const';
      const material =
          isConstNodde ? CONST_NODE_MATERIAL : NON_CONST_NODE_MATERIAL;
      const mesh = new THREE.Mesh(geometry, material);

      // Set its position with the data in the layout result.
      mesh.position.set(
          (node.x || 0) - node.width / 2, 10, (node.y || 0) + node.height / 2);
      minX = Math.min(minX, mesh.position.x);
      maxX = Math.max(maxX, mesh.position.x + node.width);
      minZ = Math.min(minZ, mesh.position.z);
      maxZ = Math.max(maxZ, mesh.position.z + node.height);

      // Initially, the mesh on the x-y plain. Rotate it to make its front face
      // to face the camera.
      mesh.rotateX(-Math.PI / 2);

      // Add to scene.
      this.scene.add(mesh);

      // Add op name text.
      const opNameText = this.createText(node.op, {
        font: Font.GoogleSansMedium,
        fontSize: node.op.length > 15 ? 8 : 11,
        color: isConstNodde ? 0x000000 : 0xffffff,
        maxWidth: node.width - 4,
        lineHeight: 1,
      });
      opNameText.position.set(node.x || 0, 20, node.y || 0);
      this.scene.add(opNameText);
      opNameText.sync(() => {
        this.render();
      });
    }
    this.currentMinX = minX;
    this.currentMaxX = maxX;
    this.currentMinZ = minZ;
    this.currentMaxZ = maxZ;

    // Render edges.
    //
    // TODO: render end arrows.
    for (const edge of modelGraphLayout.edges) {
      // For each edge, use its control points to create a curve
      // (CatmullRomCurve3), and render it with a TubeGeometry which we can
      // easily control thickness. With the OrthographicCamera, the tubes look
      // like arrow lines.
      const controlPointsVectors: THREE.Vector3[] =
          edge.controlPoints.map(pt => {
            return new THREE.Vector3(pt.x, 0, pt.y);
          });
      const curve = new THREE.CatmullRomCurve3(controlPointsVectors);
      const tubeGeometry = new THREE.TubeGeometry(
          curve,
          EDGE_NUM_SEGMENTATIONS,
          EDGE_TUBE_RADIUS,
      );
      const curveObject = new THREE.Mesh(tubeGeometry, EDGE_MATERIAL);
      this.scene.add(curveObject);
    }

    this.render();

    this.fitGraphToScreen();
  }

  private setCameraFrustum() {
    if (!this.camera || !this.container) {
      return;
    }

    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    const aspect = width / height;

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
    return needResize;
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
  private createText(content: string, properties: TextProperties): any {
    const text = new ThreeText();
    text.text = content;
    text.font = properties.font;
    text.fontSize = properties.fontSize;
    text.color = properties.color || 0x000000;
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

  private render() {
    if (!this.renderer || !this.scene || !this.camera) {
      return;
    }
    this.renderer.render(this.scene, this.camera);
  }

  private clearScene() {
    if (!this.scene) {
      return;
    }

    while (this.scene.children.length > 0) {
      const obj = this.scene.children[0] as THREE.Mesh;
      if (obj.geometry) {
        obj.geometry.dispose();
      }
      if (obj.material) {
        (obj.material as Material).dispose();
      }
      this.scene.remove(obj);
    }
  }

  private fitGraphToScreen() {
    if (!this.container) {
      return;
    }

    const view = d3.select(this.container as Element);

    const transform = d3.zoomIdentity.scale(0.1);
    (view as any).call(this.zoom.transform, transform);
    // d3.select(view).call(this.zoom.transform, transform);
  }
}
