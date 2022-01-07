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

import {HttpErrorResponse} from '@angular/common/http';
import {createAction, props} from '@ngrx/store';

import {ModelTypeId} from '../data_model/model_type';
import {TfjsRelease} from '../data_model/tfjs_release';

export enum DebuggerAction {
  SET_MODEL_TYPE = '[Conf] Set Model Type',
  FETCH_TFJS_RELEASES = '[Conf] Fetch TFJS Releases',
  FETCH_TFJS_RELEASES_SUCCESS = '[Conf] Fetch TFJS Releases - Success',
  FETCH_TFJS_RELEASES_FAIL = '[Conf] Fetch TFJS Releases - Fail',
  SET_ERROR_MESSAGE = '[App] Set Error Message',
  CLEAR_ERROR_MESSAGE = '[App] Clear Error Message',
}

/** Sets model type for the given config. */
export const setModelType = createAction(
    DebuggerAction.SET_MODEL_TYPE,
    props<{configIndex: number, modelType: ModelTypeId}>(),
);

/** Fetches available TFJS releases. */
export const fetchTfjsReleases =
    createAction(DebuggerAction.FETCH_TFJS_RELEASES);

/** Successfully fetch TFJS releases. */
export const fetchTfjsReleasesSuccess = createAction(
    DebuggerAction.FETCH_TFJS_RELEASES_SUCCESS,
    props<{releases: TfjsRelease[]}>(),
);

/** Failed to fetch TFJS releases. */
export const fetchTfjsReleasesFail = createAction(
    DebuggerAction.FETCH_TFJS_RELEASES_FAIL,
    props<{error: HttpErrorResponse}>(),
);

/** Sets the current error message. */
export const setErrorMessage = createAction(
    DebuggerAction.SET_ERROR_MESSAGE,
    props<{title: string; content: string}>(),
);

/** Clears the error message. */
export const clearErrorMessage =
    createAction(DebuggerAction.CLEAR_ERROR_MESSAGE);
