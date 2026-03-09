import { Routes } from '@angular/router';

import { HomeComponent } from './pages/home/home.component';
import { FactorySupervisionComponent } from './pages/factory-supervision/factory-supervision.component';
import { MonitorComponent } from './pages/monitor/monitor.component';

export const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'factory-supervision', component: FactorySupervisionComponent },
    { path: 'monitor', component: MonitorComponent },
    { path: '**', redirectTo: '' }
];
