import { Component, input } from '@angular/core';
import { Widget } from '../widget';
import { TabularData } from '../../../data/types';

export type TableConfig = void;

@Component({
  selector: 'db-table',
  standalone: true,
  imports: [],
  templateUrl: './table.component.html',
  styleUrl: './table.component.scss',
})
export class TableComponent implements Widget<TableConfig, TabularData> {
  data = input.required<TabularData>();
  config = input<TableConfig>();
}
