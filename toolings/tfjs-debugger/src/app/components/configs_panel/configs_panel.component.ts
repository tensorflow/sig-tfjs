import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';

/**
 * The configs panel located at the left of the screen where users set up 2
 * configurations for comparison (or 1 configuration for single-configuration
 * mode).
 *
 * Each configuration section is implemented in the `config-section` component.
 */
@Component({
  selector: 'configs-panel',
  templateUrl: './configs_panel.component.html',
  styleUrls: ['./configs_panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfigsPanel implements OnInit {
  constructor() {}

  ngOnInit() {}
}
