import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { setAppInjector } from './app/app-injector';

bootstrapApplication(AppComponent, appConfig)
  .then((appRef) => setAppInjector(appRef.injector))
  .catch((err) => console.error(err));
