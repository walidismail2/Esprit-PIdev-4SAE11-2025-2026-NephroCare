// line-chart-one.component.ts
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexStroke,
  ApexFill,
  ApexMarkers,
  ApexGrid,
  ApexDataLabels,
  ApexTooltip,
  ApexYAxis,
  ApexLegend,
  NgApexchartsModule
} from 'ng-apexcharts';

export type LineSeriesInput = {
  name: string;
  data: Array<number | null | undefined>;
};

@Component({
  selector: 'app-line-chart-one',
  standalone: true,
  imports: [NgApexchartsModule],
  templateUrl: './line-chart-one.component.html',
})
export class LineChartOneComponent implements OnChanges {
  @Input() categories: string[] = [];         // e.g. dates formatted "Feb 23"
  @Input() seriesInput: LineSeriesInput[] = []; // e.g. [{name:'spKt/V', data:[...]}, {name:'URR %', data:[...]}]
  @Input() height = 320;

  public series: ApexAxisChartSeries = [];

  public chart: ApexChart = {
    fontFamily: 'Outfit, sans-serif',
    height: this.height,
    type: 'area',
    toolbar: { show: false },
  };

  public colors: string[] = ['#465FFF', '#9CB9FF', '#22c55e', '#f59e0b'];

  public stroke: ApexStroke = { curve: 'straight', width: 2 };

  public fill: ApexFill = {
    type: 'gradient',
    gradient: { opacityFrom: 0.55, opacityTo: 0 },
  };

  public markers: ApexMarkers = {
    size: 0,
    strokeColors: '#fff',
    strokeWidth: 2,
    hover: { size: 6 },
  };

  public grid: ApexGrid = {
    xaxis: { lines: { show: false } },
    yaxis: { lines: { show: true } },
  };

  public dataLabels: ApexDataLabels = { enabled: false };

  public tooltip: ApexTooltip = { enabled: true };

  public xaxis: ApexXAxis = {
    type: 'category',
    categories: [],
    axisBorder: { show: false },
    axisTicks: { show: false },
    tooltip: { enabled: false },
  };

  public yaxis: ApexYAxis = {
    title: { text: '' },
  };

  public legend: ApexLegend = {
    show: true,
    position: 'top',
    horizontalAlign: 'left',
  };

  ngOnChanges(_: SimpleChanges): void {
    this.chart = { ...this.chart, height: this.height };
    this.xaxis = { ...this.xaxis, categories: this.categories ?? [] };

    this.series = (this.seriesInput ?? []).map(s => ({
      name: s.name,
      data: (s.data ?? []).map(v => (typeof v === 'number' ? v : null)),
    }));
  }
}