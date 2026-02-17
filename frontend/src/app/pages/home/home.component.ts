import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdaptiveScatterComponent } from '../../components/adaptive-timeseries-chart/adaptive-scatter.component';

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [CommonModule, AdaptiveScatterComponent],
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.css']
})
export class HomeComponent {
}
