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

import {getSelectors, RouterReducerState} from '@ngrx/router-store';
import {createFeatureSelector, createSelector} from '@ngrx/store';

import {ConfigIndex, UrlParamKey} from '../common/types';
import {appendConfigIndexToKey} from '../common/utils';

import {AppState} from './state';

const selectRouter = createFeatureSelector<RouterReducerState>('router');
const selectMainState = createFeatureSelector<AppState>('main');
const selectQueryParams = getSelectors(selectRouter).selectQueryParams;

/**
 * Selector to select the value for the given url parameter key and config
 * index.
 */
export const selectConfigValueFromUrl =
    (configIndex: ConfigIndex, paramKey: UrlParamKey) =>
        createSelector(selectQueryParams, (params) => {
          if (!params) {
            return undefined;
          }
          const key = appendConfigIndexToKey(paramKey, configIndex);
          return params[key];
        });

/**
 * Selector to select the value for the given url parameter key.
 */
export const selectValueFromUrl = (paramKey: UrlParamKey) =>
    createSelector(selectQueryParams, (params) => {
      if (!params) {
        return undefined;
      }
      return params[paramKey];
    });

/** Selector to select the currently loaded TFJS releases. */
export const selectTfjsReleases = createSelector(selectMainState, (state) => {
  return state.tfjsReleases;
});

/** Selector to select the current error message. */
export const selectErrorMessage = createSelector(selectMainState, (state) => {
  return state.errorMessage;
});

/** Selector to select the configs run trigger. */
export const selectRunCurrentConfigsTrigger =
    createSelector(selectMainState, (state) => {
      return state.runCurrentConfigsTrigger;
    });

/** Selector to select current configs. */
export const selectCurrentConfigs = createSelector(selectMainState, (state) => {
  return state.configs;
});

/** Selector to select current inputs. */
export const selectCurrentInputs = createSelector(selectMainState, (state) => {
  return state.inputs;
});

/** Selector to select model graph for the given config index. */
export const selectModelGraph = (configIndex: ConfigIndex) =>
    createSelector(selectMainState, (state) => {
      if (configIndex === 0) {
        return state.runResults.modelGraph1;
      } else if (configIndex === 1) {
        return state.runResults.modelGraph2;
      }
      return undefined;
    });

/** Selector to select run status. */
export const selectRunStatus = createSelector(selectMainState, (state) => {
  return state.runStatus;
});
