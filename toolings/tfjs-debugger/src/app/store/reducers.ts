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

import {createReducer, on} from '@ngrx/store';

import {RunStatus, RunTask, TaskStatus} from '../data_model/misc';

import {clearErrorMessage, fetchTfjsModelJsonFail, fetchTfjsModelJsonSuccess, fetchTfjsReleasesFail, fetchTfjsReleasesSuccess, resetRunStatus, setBadNodesThreshold, setConfigEnabled, setDiffs, setErrorMessage, setInputs, setModelType, setNodeIdToLocate, setSelectedEdgeId, setSelectedNodeId, setShowConstNodes, setTfjsBackendId, setTfjsBackendVersion, setTfjsLocalBuildSetting, setTfjsModelUrl, triggerRunCurrentConfigs, updateRunTaskStatus} from './actions';
import {Configs, initialState} from './state';
import {getRunTasksFromConfigs} from './utils';

/** Reducer for the app state. */
export const mainReducer = createReducer(
    initialState,

    on(setModelType,
       (state, {configIndex, modelType}) => {
         let configs: Configs|undefined;
         if (configIndex === 0) {
           configs = {
             ...state.configs,
             config1: {
               ...state.configs.config1,
               modelType,
             }
           };
         } else if (configIndex === 1) {
           configs = {
             ...state.configs,
             config2: {
               ...state.configs.config2,
               modelType,
             }
           };
         }
         if (!configs) {
           return state;
         } else {
           return {...state, configs};
         }
       }),

    on(setTfjsModelUrl,
       (state, {configIndex, url}) => {
         let configs: Configs|undefined;
         if (configIndex === 0) {
           configs = {
             ...state.configs,
             config1: {
               ...state.configs.config1,
               tfjsModelUrl: url,
             }
           };
         } else if (configIndex === 1) {
           configs = {
             ...state.configs,
             config2: {
               ...state.configs.config2,
               tfjsModelUrl: url,
             }
           };
         }
         if (!configs) {
           return state;
         } else {
           return {...state, configs};
         }
       }),

    on(setTfjsBackendId,
       (state, {configIndex, backendId}) => {
         let configs: Configs|undefined;
         if (configIndex === 0) {
           configs = {
             ...state.configs,
             config1: {
               ...state.configs.config1,
               backendId,
             }
           };
         } else if (configIndex === 1) {
           configs = {
             ...state.configs,
             config2: {
               ...state.configs.config2,
               backendId,
             }
           };
         }
         if (!configs) {
           return state;
         } else {
           return {...state, configs};
         }
       }),

    on(setTfjsBackendVersion,
       (state, {configIndex, version}) => {
         let configs: Configs|undefined;
         if (configIndex === 0) {
           configs = {
             ...state.configs,
             config1: {
               ...state.configs.config1,
               backendVersion: version,
             }
           };
         } else if (configIndex === 1) {
           configs = {
             ...state.configs,
             config2: {
               ...state.configs.config2,
               backendVersion: version,
             }
           };
         }
         if (!configs) {
           return state;
         } else {
           return {...state, configs};
         }
       }),

    on(setTfjsLocalBuildSetting,
       (state, {configIndex, setting}) => {
         let configs: Configs|undefined;
         if (configIndex === 0) {
           configs = {
             ...state.configs,
             config1: {
               ...state.configs.config1,
               localBuildSetting: {...setting},
             }
           };
         } else if (configIndex === 1) {
           configs = {
             ...state.configs,
             config2: {
               ...state.configs.config2,
               localBuildSetting: {...setting},
             }
           };
         }
         if (!configs) {
           return state;
         } else {
           return {...state, configs};
         }
       }),

    on(setShowConstNodes,
       (state, {configIndex, showConstNodes}) => {
         let configs: Configs|undefined;
         if (configIndex === 0) {
           configs = {
             ...state.configs,
             config1: {
               ...state.configs.config1,
               showConstNodes,
             }
           };
         } else if (configIndex === 1) {
           configs = {
             ...state.configs,
             config2: {
               ...state.configs.config2,
               showConstNodes,
             }
           };
         }
         if (!configs) {
           return state;
         } else {
           return {...state, configs};
         }
       }),

    on(setConfigEnabled,
       (state, {configIndex, enabled}) => {
         let configs: Configs|undefined;
         if (configIndex === 0) {
           configs = {
             ...state.configs,
             config1: {
               ...state.configs.config1,
               enabled,
             }
           };
         } else if (configIndex === 1) {
           configs = {
             ...state.configs,
             config2: {
               ...state.configs.config2,
               enabled,
             }
           };
         }
         if (!configs) {
           return state;
         } else {
           return {...state, configs};
         }
       }),

    on(setBadNodesThreshold,
       (state, {threshold}) => {
         return {
           ...state,
           badNodeThreshold: threshold,
         };
       }),

    on(setDiffs,
       (state, {diffs}) => {
         return {
           ...state,
           runResults: {
             ...state.runResults,
             diffs,
           },
         };
       }),


    on(setInputs,
       (state, {inputs}) => {
         return {...state, inputs};
       }),

    on(fetchTfjsReleasesSuccess,
       (state, {releases}) => {
         return {
           ...state,
           tfjsReleases: [...releases],
         };
       }),

    on(fetchTfjsReleasesFail,
       (state, {error}) => {
         return {
           ...state,
           errorMessage: {
             title: 'Network error',
             content: `Failed to load TFJS releases: ${error.message}`,
           },
         };
       }),

    on(fetchTfjsModelJsonSuccess,
       (state, {configIndex, modelGraph}) => {
         if (configIndex === 0) {
           return {
             ...state,
             runResults: {
               ...state.runResults,
               modelGraph1: modelGraph,
             },
             runStatus: {
               ...state.runStatus,
               [RunTask.LOAD_TFJS_MODEL1]: TaskStatus.SUCCESS,
             },
             errorMessage: undefined,
           };
         } else if (configIndex === 1) {
           return {
             ...state,
             runResults: {
               ...state.runResults,
               modelGraph2: modelGraph,
             },
             runStatus: {
               ...state.runStatus,
               [RunTask.LOAD_TFJS_MODEL2]: TaskStatus.SUCCESS,
             },
             errorMessage: undefined,
           };
         }
         return state;
       }),

    on(fetchTfjsModelJsonFail,
       (state, {configIndex, error}) => {
         return {
           ...state,
           errorMessage: {
             title: 'Network error',
             content: `Failed to fetch TFJS model: ${error.message}`,
           },
           runStatus: {
             ...state.runStatus,
             [configIndex === 0 ? RunTask.LOAD_TFJS_MODEL1 :
                                  RunTask.LOAD_TFJS_MODEL2]: TaskStatus.FAILED,
           },
         };
       }),

    on(setErrorMessage,
       (state, {title, content}) => {
         return {
           ...state,
           errorMessage: {
             title,
             content,
           },
         };
       }),

    on(clearErrorMessage,
       (state) => {
         return {
           ...state,
           errorMessage: undefined,
         };
       }),

    on(triggerRunCurrentConfigs,
       (state) => {
         // Get tasks for this run and set their initial status (in progress).
         const runStatus: RunStatus = {};
         for (const runTask of getRunTasksFromConfigs(state.configs)) {
           runStatus[runTask] = TaskStatus.IN_PROGRESS;
         }

         return {
           ...state,
           // Reset run results.
           runResults: {},
           runCurrentConfigsTrigger: {},
           runStatus,
           // Reset.
           selectedNodeId: '',
           selectedEdgeId: '',
           nodeIdToLocate: {id: ''},
         };
       }),

    on(updateRunTaskStatus,
       (state, {task, status}) => {
         return {
           ...state,
           runStatus: {
             ...state.runStatus,
             [task]: status,
           },
         };
       }),

    on(resetRunStatus,
       (state) => {
         return {
           ...state,
           runStatus: undefined,
         };
       }),

    on(setSelectedNodeId,
       (state, {nodeId}) => {
         return {
           ...state,
           selectedNodeId: nodeId,
           selectedEdgeId: '',
         };
       }),

    on(setSelectedEdgeId,
       (state, {edgeId}) => {
         return {
           ...state,
           selectedEdgeId: edgeId,
           selectedNodeId: '',
         };
       }),

    on(setNodeIdToLocate,
       (state, {nodeId}) => {
         return {
           ...state,
           nodeIdToLocate: {id: nodeId},
           selectedNodeId: nodeId,
           selectedEdgeId: '',
         };
       }),
);
