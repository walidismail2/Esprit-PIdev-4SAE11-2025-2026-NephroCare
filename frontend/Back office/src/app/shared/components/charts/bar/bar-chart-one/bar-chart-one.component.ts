// bar-chart-one.component.ts
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexPlotOptions,
  ApexStroke,
  ApexXAxis,
  ApexYAxis,
  ApexLegend,
  ApexGrid,
  ApexFill,
  ApexTooltip
} from 'ng-apexcharts';
import { NgApexchartsModule } from 'ng-apexcharts';

@Component({
  selector: 'app-bar-chart-one',
  standalone: true,
  imports: [NgApexchartsModule],
  templateUrl: './bar-chart-one.component.html',
})
export class BarChartOneComponent implements OnChanges {
  @Input() title = 'Bar Chart';
  @Input() seriesName = 'Value';
  @Input() categories: string[] = [];
  @Input() values: Array<number | null | undefined> = [];
  @Input() height = 220;
  @Input() valueSuffix = ''; // "%" or "" etc.

  public series: ApexAxisChartSeries = [{ name: this.seriesName, data: [] }];

  public chart: ApexChart = {
    fontFamily: 'Outfit, sans-serif',
    type: 'bar',
    height: this.height,
    toolbar: { show: false },
  };

  public colors: string[] = ['#465fff'];

  public plotOptions: ApexPlotOptions = {
    bar: {
      horizontal: false,
      columnWidth: '40%',
      borderRadius: 6,
      borderRadiusApplication: 'end',
    },
  };

  public dataLabels: ApexDataLabels = { enabled: false };

  public stroke: ApexStroke = { show: true, width: 3, colors: ['transparent'] };

  public xaxis: ApexXAxis = {
    categories: [],
    axisBorder: { show: false },
    axisTicks: { show: false },
  };

  public yaxis: ApexYAxis = { title: { text: undefined } };

  public legend: ApexLegend = { show: false };

  public grid: ApexGrid = { yaxis: { lines: { show: true } } };

  public fill: ApexFill = { opacity: 1 };

  public tooltip: ApexTooltip = {
    x: { show: true },
    y: {
      formatter: (val: number) => `${val}${this.valueSuffix}`,
    },
  };

  ngOnChanges(changes: SimpleChanges): void {
    // update chart height
    this.chart = { ...this.chart, height: this.height };

    // update x labels
    this.xaxis = { ...this.xaxis, categories: this.categories ?? [] };

    // update series
    const data = (this.values ?? []).map(v => (typeof v === 'number' ? v : null));
    this.series = [{ name: this.seriesName, data }];
  }
}