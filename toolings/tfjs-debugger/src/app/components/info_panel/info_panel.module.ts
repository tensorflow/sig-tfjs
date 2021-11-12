import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';

import {InfoPanel} from './info_panel.component';

@NgModule({
  declarations: [
    InfoPanel,
  ],
  imports: [
    CommonModule,
  ],
  exports: [
    InfoPanel,
  ]
})
export class InfoPanelModule {
}
