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

import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {RouterModule} from '@angular/router';
import {routerReducer, StoreRouterConnectingModule} from '@ngrx/router-store';
import {StoreModule} from '@ngrx/store';
import {StoreDevtoolsModule} from '@ngrx/store-devtools';

import {AppBarModule} from '../components/app_bar/app_bar.module';
import {ConfigsPanelModule} from '../components/configs_panel/configs_panel.module';
import {GraphPaneModule} from '../components/graph_panel/graph_panel.module';
import {InfoPanelModule} from '../components/info_panel/info_panel.module';
import {configsReducer} from '../store/reducers';

import {AppComponent} from './app.component';

/** The main application module. */
@NgModule({
  declarations: [AppComponent],
  imports: [
    AppBarModule,
    BrowserModule,
    BrowserAnimationsModule,
    ConfigsPanelModule,
    InfoPanelModule,
    GraphPaneModule,
    StoreModule.forRoot({
      router: routerReducer,
      configs: configsReducer,
    }),
    RouterModule.forRoot([
      {path: '', component: AppComponent},
      {path: '**', redirectTo: ''},
    ]),
    StoreRouterConnectingModule.forRoot(),
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
}

/**
 * The DevAppModule adds the NgRx dev tools support when running in dev
 * mode.
 *
 * Download the chrome extension that works with internal sites at:
 * go/redux-devtools
 */
@NgModule({
  imports: [
    AppModule,
    StoreDevtoolsModule.instrument({
      maxAge: 200,      // Retains last 200 states
      autoPause: true,  // Pauses recording actions and state changes when the
                        // extension window is not open
    }),
  ],
  bootstrap: [AppComponent]
})
export class DevAppModule {
}
