import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';

import {ConfigSectionModule} from '../config_section/config_section.module';

import {ConfigsPanel} from './configs_panel.component';

@NgModule({
  declarations: [
    ConfigsPanel,
  ],
  imports: [
    CommonModule,
    ConfigSectionModule,
  ],
  exports: [
    ConfigsPanel,
  ]
})
export class ConfigsPanelModule {
}
