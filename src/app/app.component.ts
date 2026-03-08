import { Component } from '@angular/core';
import { TimelinePageComponent } from './features/timeline/timeline-page.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [TimelinePageComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {}
