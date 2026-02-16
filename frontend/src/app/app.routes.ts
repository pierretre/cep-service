import { Routes } from '@angular/router';

import { HomeComponent } from './pages/home/home.component';
import { MonitorComponent } from './pages/monitor/monitor.component';

export const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'monitor', component: MonitorComponent },
    { path: '**', redirectTo: '' }
];
