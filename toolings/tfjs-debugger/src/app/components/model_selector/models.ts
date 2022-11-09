import {ModelItem} from './model_menu.component';

export const MODELS: ModelItem[] = [
  {
    label: 'Mobilenet V2',
    url:
        'https://tfhub.dev/google/tfjs-model/imagenet/mobilenet_v2_100_224/classification/3/default/1',
  },
  {
    label: 'Mobilenet V3',
    url:
        'https://tfhub.dev/google/tfjs-model/imagenet/mobilenet_v3_large_100_224/classification/5/default/1',
  },
  {
    label: 'Hand pose detector',
    url: 'https://tfhub.dev/mediapipe/tfjs-model/handpose_3d/detector/{}/1',
    children: ['lite', 'full']
  },
  {

    label: 'Hand pose landmark',
    url: `https://tfhub.dev/mediapipe/tfjs-model/handpose_3d/landmark/{}/1`,
    children: ['lite', 'full']
  },
  {
    label: 'BlazePose detector',
    url: 'https://tfhub.dev/mediapipe/tfjs-model/blazeposedetector/1/default/1',
  },
  {

    label: 'BlazePose landmark',
    url:
        'https://tfhub.dev/mediapipe/tfjs-model/blazeposelandmark_{}/2/default/2',
  },
  {
    label: 'Movenet single pose',
    url: 'https://tfhub.dev/google/tfjs-model/movenet/singlepose/{}/4',
    children: ['lightning', 'thunder']
  },
  {
    label: 'Movenet multipose lightning',
    url: 'https://tfhub.dev/google/tfjs-model/movenet/multipose/lightning/1',
  },
  {
    label: 'Posenet',
    url:
        'https://storage.googleapis.com/tfjs-models/savedmodel/posenet/mobilenet/float/075/model-stride16.json',
  },
  {
    label: 'Coco SSD',
    url: '',
    children: [
      {
        label: 'Mobilenet V1',
        url:
            'https://storage.googleapis.com/tfjs-models/savedmodel/ssd_mobilenet_v1/model.json',
      },
      {
        label: 'Mobilenet V2',
        url:
            'https://storage.googleapis.com/tfjs-models/savedmodel/ssd_mobilenet_v2/model.json',
      },
      {
        label: 'Lite mobilenet v2',
        url:
            'https://storage.googleapis.com/tfjs-models/savedmodel/ssdlite_mobilenet_v2/model.json'
      }
    ]
  },
  {
    label: 'DeeplabV3',
    url:
        'https://storage.googleapis.com/tfhub-tfjs-modules/tensorflow/tfjs-model/deeplab/{}/1/quantized/2/1/model.json',
    children: ['pascal', 'ade20k']
  },
  {
    label: 'Face detection',
    url: 'https://tfhub.dev/mediapipe/tfjs-model/face_detection/{}/1',
    children: ['short', 'full']
  },
  {
    label: 'Face landmark detection',
    url: 'https://tfhub.dev/mediapipe/tfjs-model/face_landmarks_detection/{}/1',
    children: ['attention_mesh', 'face_mesh'],
  },
  {
    label: 'AR portrait depth',
    url: 'https://tfhub.dev/tensorflow/tfjs-model/ar_portrait_depth/1',
  },
  {
    label: 'Selfie segmentation',
    url: 'https://tfhub.dev/mediapipe/tfjs-model/selfie_segmentation/{}/1',
    children: ['general', 'landscape']
  },
  {
    label: 'AutoML image',
    url:
        'https://storage.googleapis.com/tfjs-testing/tfjs-automl/img_classification/model.json',
  },
  {
    label: 'TextToxicity',
    url:
        'https://storage.googleapis.com/tfhub-tfjs-modules/tensorflow/tfjs-model/toxicity/1/default/1/model.json',
  },
  {
    label: 'Mobile bert',
    url: 'https://tfhub.dev/tensorflow/tfjs-model/mobilebert/1',
  },
  // TODO(jingjin): this model needs hashtable input that is not supported for
  // now.
  //
  // {
  //   label: 'AutoML object',
  //   url:
  //       'https://storage.googleapis.com/tfjs-testing/tfjs-automl/object_detection/model.json',
  // },
].sort((a, b) => a.label.localeCompare(b.label));
