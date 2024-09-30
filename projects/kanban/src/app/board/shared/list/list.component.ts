import {
  Component,
  effect,
  inject,
  Injector,
  input,
  output,
  signal,
} from '@angular/core';
import { CtxMenuService } from '@ngx-templates/shared/context-menu';
import { IconComponent } from '@ngx-templates/shared/icon';

import { BoardList } from '../../../../models';
import { NewCardInputComponent } from './new-card-input/new-card-input.component';
import { CardsService } from '../../data-access/cards.service';
import { ListsService } from '../../data-access/lists.service';
import {
  ListCtxMenuComponent,
  ListCtxMenuData,
} from './list-ctx-menu/list-ctx-menu.component';
import { InteractiveTitleComponent } from '../interactive-title/interactive-title.component';

@Component({
  selector: 'kb-list',
  standalone: true,
  imports: [NewCardInputComponent, InteractiveTitleComponent, IconComponent],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss',
})
export class ListComponent {
  private _cards = inject(CardsService);
  private _lists = inject(ListsService);
  private _ctxMenu = inject(CtxMenuService);
  private _injector = inject(Injector);

  list = input.required<BoardList>();
  cardCreatorEnabled = output<boolean>();

  cardCreator = signal<'top' | 'bottom' | 'none'>('none');

  constructor() {
    effect(() => {
      const creatorEnabled = this.cardCreator() !== 'none';
      this.cardCreatorEnabled.emit(creatorEnabled);
    });
  }

  createCard(title: string, insertOnTop?: boolean) {
    this._cards.createCard(this.list().id, title, insertOnTop);
  }

  updateName(name: string) {
    if (name !== this.list().name) {
      this._lists.updateListName(this.list().id, name);
    }
  }

  openCtxMenu(e: MouseEvent) {
    this._ctxMenu.openMenu<ListCtxMenuData>(
      ListCtxMenuComponent,
      e,
      { listId: this.list().id },
      { injector: this._injector },
    );
  }
}
