import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';

@Component({
  selector: 'graph-panel',
  templateUrl: './graph_panel.component.html',
  styleUrls: ['./graph_panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GraphPanel implements OnInit {
  constructor() {}

  ngOnInit() {}
}
