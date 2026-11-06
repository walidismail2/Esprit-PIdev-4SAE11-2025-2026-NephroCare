import { Component, OnInit } from '@angular/core';
import { Alert} from "../../../shared/models/alert.model";
import { AlertService} from "../../../shared/services/alert.service";
import {DatePipe, NgClass} from "@angular/common";

@Component({
    selector: 'app-alerts-list',
    templateUrl: './alerts-list.component.html',
    imports: [
        DatePipe,
        NgClass
    ],
    styleUrls: ['./alerts-list.component.css']
})
export class AlertsListComponent implements OnInit {
    alerts: Alert[] = [];
    filteredAlerts: Alert[] = [];
    loading = false;
    error = '';

    selectedSeverity = 'ALL';
    selectedCategory = 'ALL';

    constructor(private alertService: AlertService) {}

    ngOnInit(): void {
        this.loadAlerts();
    }

    loadAlerts(): void {
        this.loading = true;
        this.error = '';

        this.alertService.getOpenAlerts().subscribe({
            next: (data) => {
                this.alerts = data;
                this.applyFilters();
                this.loading = false;
            },
            error: (err) => {
                console.error(err);
                this.error = 'Failed to load alerts.';
                this.loading = false;
            }
        });
    }

    applyFilters(): void {
        this.filteredAlerts = this.alerts.filter(alert => {
            const severityMatch =
                this.selectedSeverity === 'ALL' || alert.severity === this.selectedSeverity;

            const categoryMatch =
                this.selectedCategory === 'ALL' || alert.category === this.selectedCategory;

            return severityMatch && categoryMatch;
        });
    }

    onSeverityChange(value: string): void {
        this.selectedSeverity = value;
        this.applyFilters();
    }

    onCategoryChange(value: string): void {
        this.selectedCategory = value;
        this.applyFilters();
    }

    acknowledge(alert: Alert): void {
        this.alertService.acknowledge(alert.id).subscribe({
            next: () => this.loadAlerts(),
            error: (err) => {
                console.error(err);
                this.error = 'Failed to acknowledge alert.';
            }
        });
    }

    resolve(alert: Alert): void {
        this.alertService.resolve(alert.id).subscribe({
            next: () => this.loadAlerts(),
            error: (err) => {
                console.error(err);
                this.error = 'Failed to resolve alert.';
            }
        });
    }

    severityClass(severity: string): string {
        switch (severity) {
            case 'CRITICAL':
                return 'severity-critical';
            case 'WARNING':
                return 'severity-warning';
            default:
                return 'severity-info';
        }
    }
}