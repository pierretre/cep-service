import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ReplanningIncident } from '../../models/replanning-incident.model';

@Component({
    selector: 'app-replanning-incident-popup',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './replanning-incident-popup.component.html',
    styleUrls: ['./replanning-incident-popup.component.css']
})
export class ReplanningIncidentPopupComponent {
    @Input({ required: true }) incident!: ReplanningIncident;
    @Output() validateCorrection = new EventEmitter<string>();

    comment = '';

    onValidateCorrection(): void {
        this.validateCorrection.emit(this.comment.trim());
        this.comment = '';
    }
}
