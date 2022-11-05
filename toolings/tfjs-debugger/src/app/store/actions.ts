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

import {BackendId} from '../data_model/backend_type';
import {Input} from '../data_model/input';
import {RunTask, TaskStatus} from '../data_model/misc';
import {ModelTypeId} from '../data_model/model_type';
import {Diffs, ModelGraph} from '../data_model/run_results';
import {TfjsRelease} from '../data_model/tfjs_release';

export enum DebuggerAction {
  SET_MODEL_TYPE = '[Conf] Set Model Type',
  SET_TFSJS_MODEL_URL = '[Conf] Set TFJS Model Url',
  SET_TFJS_BACKEND_ID = '[Conf] Set TFJS Backend Id',
  SET_TFJS_BACKEND_VERSION = '[Conf] Set TFJS Backend Version',
  SET_CONFIG_ENABLED = '[Conf] Set Config Enabled',
  SET_BAD_NODES_THRESHOLD = '[Conf] Set Bad Nodes Threshold',
  SET_INPUTS = '[Input] Set Inputs',
  SET_DIFFS = '[Run] Set Diffs',
  FETCH_TFJS_RELEASES = '[Conf] Fetch TFJS Releases',
  FETCH_TFJS_RELEASES_SUCCESS = '[Conf] Fetch TFJS Releases - Success',
  FETCH_TFJS_RELEASES_FAIL = '[Conf] Fetch TFJS Releases - Fail',
  FETCH_TFJS_MODEL_JSON = '[Run] Fetch TFJS Model Json',
  FETCH_TFJS_MODEL_JSON_SUCCESS = '[Run] Fetch TFJS Model Json - Success',
  FETCH_TFJS_MODEL_JSON_FAIL = '[Run] Fetch TFJS Model Json - Fail',
  SET_ERROR_MESSAGE = '[App] Set Error Message',
  CLEAR_ERROR_MESSAGE = '[App] Clear Error Message',
  TRIGGER_RUN_CURRENT_CONFIGS = '[App] Trigger to Run Current Configs',
  UPDATE_RUN_TASK_STATUS = '[App] Update Run Task Status',
  RESET_RUN_STATUS = '[App] Reset Run Status',
  SET_SELECTED_NODE_ID = '[App] Set Selected Node Id',
  SET_SELECTED_EDGE_ID = '[App] Set Selected Edge Id',
  SET_NODE_ID_TO_LOCATE = '[App] Set Node Id To Locate',
}

/** Sets model type for the given config. */
export const setModelType = createAction(
    DebuggerAction.SET_MODEL_TYPE,
    props<{configIndex: number, modelType: ModelTypeId}>(),
);

/** Sets tfjs model url for the given config. */
export const setTfjsModelUrl = createAction(
    DebuggerAction.SET_TFSJS_MODEL_URL,
    props<{configIndex: number, url: string}>(),
);

/** Sets tfjs backend id for the given config. */
export const setTfjsBackendId = createAction(
    DebuggerAction.SET_TFJS_BACKEND_ID,
    props<{configIndex: number, backendId: BackendId}>(),
);

/** Sets tfjs backend version for the given config. */
export const setTfjsBackendVersion = createAction(
    DebuggerAction.SET_TFJS_BACKEND_VERSION,
    props<{configIndex: number, version: string}>(),
);

/** Sets tfjs backend version for the given config. */
export const setConfigEnabled = createAction(
    DebuggerAction.SET_CONFIG_ENABLED,
    props<{configIndex: number, enabled: boolean}>(),
);

/** Sets bad nodes threshold. */
export const setBadNodesThreshold = createAction(
    DebuggerAction.SET_BAD_NODES_THRESHOLD,
    props<{threshold: number}>(),
);

/** Sets diffs. */
export const setDiffs = createAction(
    DebuggerAction.SET_DIFFS,
    props<{diffs: Diffs}>(),
);

/** Sets inputs. */
export const setInputs = createAction(
    DebuggerAction.SET_INPUTS,
    props<{inputs: Input[]}>(),
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

/** Fetches TFJS model json file. */
export const fetchTfjsModelJson = createAction(
    DebuggerAction.FETCH_TFJS_MODEL_JSON,
    props<{configIndex: number; url: string}>(),
);

/** Successfully fetch TFJS model json file. */
export const fetchTfjsModelJsonSuccess = createAction(
    DebuggerAction.FETCH_TFJS_MODEL_JSON_SUCCESS,
    props<{configIndex: number; modelGraph: ModelGraph}>(),
);

/** Failed to fetch TFJS model json file. */
export const fetchTfjsModelJsonFail = createAction(
    DebuggerAction.FETCH_TFJS_MODEL_JSON_FAIL,
    props<{configIndex: number; error: HttpErrorResponse}>(),
);

/** Sets the current error message. */
export const setErrorMessage = createAction(
    DebuggerAction.SET_ERROR_MESSAGE,
    props<{title: string; content: string}>(),
);

/** Clears the error message. */
export const clearErrorMessage =
    createAction(DebuggerAction.CLEAR_ERROR_MESSAGE);

/** Trigger to run current configs. */
export const triggerRunCurrentConfigs =
    createAction(DebuggerAction.TRIGGER_RUN_CURRENT_CONFIGS);

/** Updates status for the given run task. */
export const updateRunTaskStatus = createAction(
    DebuggerAction.UPDATE_RUN_TASK_STATUS,
    props<{task: RunTask, status: TaskStatus}>(),
);

/** Sets the selected node id. */
export const setSelectedNodeId = createAction(
    DebuggerAction.SET_SELECTED_NODE_ID,
    props<{nodeId: string}>(),
);

/** Sets the selected edge id. */
export const setSelectedEdgeId = createAction(
    DebuggerAction.SET_SELECTED_EDGE_ID,
    props<{edgeId: string}>(),
);

/** Sets the node id to locate. */
export const setNodeIdToLocate = createAction(
    DebuggerAction.SET_NODE_ID_TO_LOCATE,
    props<{nodeId: string}>(),
);

/** Resets run status. */
export const resetRunStatus = createAction(DebuggerAction.RESET_RUN_STATUS);
