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

import {preloadFont, Text as ThreeText} from 'troika-three-text';

// Fonts that will be used in the scene.
export enum Font {
  GoogleSansMedium = 'assets/GoogleSans-Medium.ttf',
}

// See
// https://protectwise.github.io/troika/troika-three-text/#supported-properties
export interface TextProperties {
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


export function preloadTroikaThreeTextFont() {
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
}

export function createText(
    content: string, properties: TextProperties,
    // tslint:disable-next-line:no-any
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
