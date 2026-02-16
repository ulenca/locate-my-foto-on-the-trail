import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: '<router-outlet/>',
  standalone: true
})
export class App {
  protected readonly title = signal('locate-my-foto-on-the-trail');
}
