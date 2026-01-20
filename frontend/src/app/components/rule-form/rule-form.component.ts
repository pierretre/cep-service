import { Component, EventEmitter, Output, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RuleService } from '../../services/rule.service';
import { Rule } from '../../models/rule.model';

@Component({
    selector: 'app-rule-form',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './rule-form.component.html',
    styleUrls: ['./rule-form.component.css']
})
export class RuleFormComponent implements OnChanges {
    @Input() editRule: Rule | null = null;
    @Output() close = new EventEmitter<void>();
    @Output() ruleCreated = new EventEmitter<void>();
    @Output() ruleUpdated = new EventEmitter<void>();
    @Output() ruleDeleted = new EventEmitter<void>();

    isSubmitting = false;
    isDeleting = false;
    submitMessage: { type: 'success' | 'error', text: string } | null = null;
    newRule = {
        name: '',
        description: '',
        severity: 'Info',
        eplQuery: '',
        active: true
    };

    constructor(private readonly ruleService: RuleService) { }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['editRule'] && this.editRule) {
            // Populate form with rule data for editing
            this.newRule = {
                name: this.editRule.name,
                description: this.editRule.description,
                severity: 'Info', // This field doesn't exist in Rule model, keeping for form
                eplQuery: this.editRule.eplQuery,
                active: this.editRule.active
            };
        }
    }

    get isEditMode(): boolean {
        return this.editRule !== null;
    }

    get formTitle(): string {
        return this.isEditMode ? 'Edit Rule' : 'Create Rule';
    }

    get submitButtonText(): string {
        return this.isEditMode ? 'Update Rule' : 'Create Rule';
    }

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

        const ruleData = {
            name: this.newRule.name,
            eplQuery: this.newRule.eplQuery,
            description: this.newRule.description,
            active: this.newRule.active
        };

        if (this.isEditMode) {
            // Update existing rule
            this.ruleService.updateRule(this.editRule!.id, ruleData).subscribe({
                next: (response: any) => {
                    const rule = response.rule;
                    const message = response.message || `Rule "${rule.name}" updated successfully!`;

                    console.log('Rule updated successfully:', rule);
                    this.submitMessage = {
                        type: 'success',
                        text: message
                    };
                    this.isSubmitting = false;
                    this.ruleUpdated.emit();

                    setTimeout(() => {
                        this.submitMessage = null;
                    }, 3000);
                },
                error: (error: any) => {
                    console.error('Error updating rule:', error);
                    const errorMessage = error.error?.message || error.error || error.message || 'Failed to update rule. Please check your EPL query and try again.';
                    this.submitMessage = {
                        type: 'error',
                        text: errorMessage
                    };
                    this.isSubmitting = false;
                }
            });
        } else {
            // Create new rule
            this.ruleService.createRule(ruleData).subscribe({
                next: (rule: any) => {
                    console.log('Rule created successfully:', rule);
                    this.submitMessage = {
                        type: 'success',
                        text: `Rule "${rule.name}" created successfully!`
                    };
                    this.isSubmitting = false;
                    this.ruleCreated.emit();

                    setTimeout(() => {
                        this.resetForm();
                    }, 3000);
                },
                error: (error: any) => {
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

    onDeleteRule(): void {
        if (!this.isEditMode || !confirm(`Are you sure you want to delete the rule "${this.editRule!.name}"?\n\nWARNING: This will also delete all incidents associated with this rule.\n\nThis action cannot be undone.`)) {
            return;
        }

        this.isDeleting = true;
        this.submitMessage = null;

        this.ruleService.deleteRule(this.editRule!.id).subscribe({
            next: () => {
                console.log('Rule deleted successfully');
                this.submitMessage = {
                    type: 'success',
                    text: `Rule "${this.editRule!.name}" and associated incidents deleted successfully!`
                };
                this.isDeleting = false;
                this.ruleDeleted.emit();

                // Close panel after a short delay
                setTimeout(() => {
                    this.onClose();
                }, 2000);
            },
            error: (error: any) => {
                console.error('Error deleting rule:', error);
                const errorMessage = error.error?.message || error.error || error.message || 'Failed to delete rule.';
                this.submitMessage = {
                    type: 'error',
                    text: errorMessage
                };
                this.isDeleting = false;
            }
        });
    }

    onToggleActive(): void {
        if (!this.isEditMode) {
            return;
        }

        const operation = this.editRule!.active
            ? this.ruleService.deactivateRule(this.editRule!.id)
            : this.ruleService.activateRule(this.editRule!.id);

        operation.subscribe({
            next: () => {
                const newStatus = !this.editRule!.active;
                console.log(`Rule ${newStatus ? 'activated' : 'deactivated'} successfully`);
                this.submitMessage = {
                    type: 'success',
                    text: `Rule "${this.editRule!.name}" ${newStatus ? 'activated' : 'deactivated'} successfully!`
                };

                // Update local state
                this.editRule!.active = newStatus;
                this.newRule.active = newStatus;
                this.ruleUpdated.emit();

                // Clear message after delay
                setTimeout(() => {
                    this.submitMessage = null;
                }, 3000);
            },
            error: (error: any) => {
                console.error('Error toggling rule status:', error);
                const errorMessage = error.error?.message || error.error || error.message || 'Failed to toggle rule status.';
                this.submitMessage = {
                    type: 'error',
                    text: errorMessage
                };
            }
        });
    }
}
