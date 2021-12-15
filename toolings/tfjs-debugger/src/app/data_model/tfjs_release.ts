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

import dateFormat from 'dateformat';

/** Stores data for a TFJS release. */
export interface TfjsRelease {
  /** Version string of the release, e.g. 3.12.0 */
  version: string;

  /** Publish date, e.g. 2021-12-08 */
  date: string;

  // Add more fields as needed.
}

/** Json structure for the content returned by github releases API. */
export declare interface ReleaseJson {
  tag_name: string;
  published_at: string;

  // Add more fields as needed.
}

/** Converts the given release json object to TfjsRelease. */
export function releaseJsonToTfjsRelease(json: ReleaseJson): TfjsRelease|
    undefined {
  // Example: 'tfjs-v3.12.0'.
  const tagName = json.tag_name;

  // Only keep the main tfjs releases.
  if (!tagName.startsWith('tfjs-v') || tagName.startsWith('tfjs-vis')) {
    return undefined;
  }

  // Remove 'tfjs-v' prefix.
  const version = tagName.replace('tfjs-v', '');

  // Only keep 3.x releases.
  if (!version.startsWith('3.')) {
    return undefined;
  }

  // The original date string is in the form of 2021-10-22T02:07:40Z.
  // Re-format it to "Fri, Oct 22, 2021".
  const date = dateFormat(new Date(json.published_at), 'ddd, mmm dd, yyyy');

  return {
    version,
    date,
  };
}
