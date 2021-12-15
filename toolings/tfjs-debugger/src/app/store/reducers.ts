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

import {clearErrorMessage, fetchTfjsReleasesFail, fetchTfjsReleasesSuccess, setErrorMessage} from './actions';
import {initialState} from './state';

/** Reducer for the app state. */
export const mainReducer = createReducer(
    initialState,

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
);
