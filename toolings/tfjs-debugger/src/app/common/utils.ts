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

import {TypedArray} from '../data_model/run_results';

import {UrlParamKey} from './types';

const CONFIG_INDEX_SEP = '__';

/**
 * A helper function to append config index (0 or 1) to the given url parameter
 * key.
 */
export function appendConfigIndexToKey(paramKey: UrlParamKey, index: number) {
  return `${paramKey}${CONFIG_INDEX_SEP}${index}`;
}

/**
 * A helper functino to create a typed array for the given dtype and size.
 */
export function getTypedArrayFromInput(
    dtype: string, shape: number[]): TypedArray {
  const size = Math.abs(shape.reduce((a, b) => a * b, 1));
  switch (dtype) {
    case 'float32':
      return new Float32Array(size);
    case 'int32':
      return new Int32Array(size);
    case 'int8':
      return new Uint8Array(size);
    default:
      return new Float32Array(size);
  }
}

/**
 * A helper function to calculate relative diff between two numbers.
 */
export function calculateRelativeDiff(v1: number, v2: number): number {
  let diff = v1 / v2;
  if (Math.abs(v2) < 1e-7) {
    diff = (Math.abs(v1) < 1e-7) ? 0 : Infinity;
  }
  return diff;
}

/**
 * A helper function to get the diff string in pct.
 */
export function getPctDiffString(diff: number): string {
  if (diff === 0) {
    return '0%';
  }
  if (diff === Infinity) {
    return 'Inf';
  }
  let str = `${(diff * 100).toFixed(2)}%`;
  if (str === '0.00%' || str == '-0.00%') {
    str = '0%';
  }
  return str;
}
