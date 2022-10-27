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

import {clearErrorMessage, fetchTfjsModelJsonFail, fetchTfjsModelJsonSuccess, fetchTfjsReleasesFail, fetchTfjsReleasesSuccess, resetRunStatus, setErrorMessage, setInputs, setModelType, setTfjsModelUrl, triggerRunCurrentConfigs, updateRunTaskStatus} from './actions';
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

    on(setInputs,
       (state, {inputs}) => {
         console.log(inputs);
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
);
