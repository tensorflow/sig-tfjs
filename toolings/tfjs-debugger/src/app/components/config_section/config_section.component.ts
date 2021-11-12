import {ChangeDetectionStrategy, Component, Input, OnInit} from '@angular/core';
import {ConfigIndex} from 'src/app/common/types';

/** A single configuration in the configs panel. */
@Component({
  selector: 'config-section',
  templateUrl: './config_section.component.html',
  styleUrls: ['./config_section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfigSection implements OnInit {
  @Input() configIndex!: ConfigIndex;

  constructor() {}

  ngOnInit() {
    if (this.configIndex == null) {
      throw new Error('configIndex not set');
    }
  }
}
