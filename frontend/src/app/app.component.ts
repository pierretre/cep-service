import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UiInteractionObserverService } from './tracing/interaction-observer';
import { UiVisibilityObserverService } from './tracing/ui-visibility-observer.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  constructor(
    private visibilityObserver: UiVisibilityObserverService,
    private interactionObserver: UiInteractionObserverService
  ) { }

  ngOnInit(): void {
    this.visibilityObserver.start({
      selector: '*',
      threshold: 0.1,
      logOncePerElement: true
    });

    this.interactionObserver.start({
      scrollThrottleMs: 250
    });
  }

  ngOnDestroy(): void {
    this.visibilityObserver.stop();
    this.interactionObserver.stop();
  }
}

