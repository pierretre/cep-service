import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RuleService } from '../../services/rule.service';

@Component({
    selector: 'app-rule-form',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './rule-form.component.html',
    styleUrls: ['./rule-form.component.css']
})
export class RuleFormComponent {
    @Output() close = new EventEmitter<void>();
    @Output() ruleCreated = new EventEmitter<void>();

    isSubmitting = false;
    submitMessage: { type: 'success' | 'error', text: string } | null = null;
    newRule = {
        name: '',
        description: '',
        severity: 'Info',
        eplQuery: '',
        active: true
    };

    constructor(private readonly ruleService: RuleService) { }

    onClose(): void {
        this.close.emit();
    }

    resetForm(): void {
        this.newRule = {
            name: '',
            description: '',
            severity: 'Info',
            eplQuery: '',
            active: true
        };
        this.submitMessage = null;
    }

    dismissMessage(): void {
        this.submitMessage = null;
    }

    onSubmitRule(): void {
        if (!this.newRule.name || !this.newRule.eplQuery) {
            return;
        }

        this.isSubmitting = true;
        this.submitMessage = null;

        this.ruleService.createRule({
            name: this.newRule.name,
            eplQuery: this.newRule.eplQuery,
            description: this.newRule.description,
            active: this.newRule.active
        }).subscribe({
            next: (rule) => {
                console.log('Rule created successfully:', rule);
                this.submitMessage = {
                    type: 'success',
                    text: `Rule "${rule.name}" created successfully!`
                };
                this.isSubmitting = false;
                this.ruleCreated.emit();

                // Reset form after a short delay
                setTimeout(() => {
                    this.resetForm();
                }, 3000);
            },
            error: (error) => {
                console.error('Error creating rule:', error);
                const errorMessage = error.error?.message || error.error || error.message || 'Failed to create rule. Please check your EPL query and try again.';
                this.submitMessage = {
                    type: 'error',
                    text: errorMessage
                };
                this.isSubmitting = false;
            }
        });
    }
}
