import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';

import {GraphPanel} from './graph_panel.component';

@NgModule({
  declarations: [
    GraphPanel,
  ],
  imports: [
    CommonModule,
  ],
  exports: [
    GraphPanel,
  ],
})
export class GraphPaneModule {
}
