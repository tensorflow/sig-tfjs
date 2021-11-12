import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';

/**
 * The info panel located at the right side of the screen. It shows the summary
 * of the run and the detailed data for the selected node in the model graph.
 */
@Component({
  selector: 'info-panel',
  templateUrl: './info_panel.component.html',
  styleUrls: ['./info_panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InfoPanel implements OnInit {
  constructor() {}

  ngOnInit() {}
}
