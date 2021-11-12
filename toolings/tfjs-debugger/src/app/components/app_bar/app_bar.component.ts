import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';

/**
 * The app bar located at the top of the screen that shows the app title and a
 * set of action buttons.
 */
@Component({
  selector: 'app-bar',
  templateUrl: './app_bar.component.html',
  styleUrls: ['./app_bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppBar implements OnInit {
  constructor() {}

  ngOnInit() {}
}
