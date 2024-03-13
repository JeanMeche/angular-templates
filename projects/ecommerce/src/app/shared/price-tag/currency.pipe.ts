import { Pipe, PipeTransform } from '@angular/core';
import { environment as env } from '../../../environments/environment';
import { Common as CommonEnv } from '../../../environments/common';

type CurrencyType = typeof CommonEnv.currency;

const CURRENCY_SYMBOL: { [key in CurrencyType]: string } = {
  ['USD']: '$',
  ['EUR']: '€',
};

const round = (a: number) => Math.round(a * 100) / 100;

@Pipe({
  name: 'currency',
  standalone: true,
})
export class CurrencyPipe implements PipeTransform {
  transform(amount: number) {
    return `${CURRENCY_SYMBOL[env.currency]} ${round(amount)}`;
  }
}
