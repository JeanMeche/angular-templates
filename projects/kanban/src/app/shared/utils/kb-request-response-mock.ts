/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injector } from '@angular/core';
import { MockFn } from '@ngx-templates/shared/fetch';
import { LocalStorage } from '@ngx-templates/shared/services';

import MockData from '../../../../public/mock-data.json';
import { environment } from '../../../environments/environment';
import {
  ApiLabel,
  ApiRequestCard,
  ApiRequestLabel,
} from '../../api/utils/types';

type ApiCard = {
  id: string;
  title: string;
  labelIds: string[];
  pos: number;
  listId: string;
  description: string;
};

type MockStore = {
  board: {
    boardId: string;
    boardName: string;
    labels: ApiLabel[];
    lists: {
      id: string;
      name: string;
    }[];
  };
  cards: ApiCard[];
};

const STORE_KEY = 'kb-dev-db';

// Note(Georgi): The cards and lists have specific order/position in their
// respective containers. In Store.cards, this is represented by the `pos`
// property (i.e. the array order is not important). However, in Store.lists
// the order of the items in the array is crucial since it represents the
// actual position.
let Store: MockStore;

/**
 * Returns mocked data based on a request URL
 *
 * @param url Request URL
 * @returns
 */
export const kanbanRequestResponseMock: MockFn = (
  url: string,
  method: string,
  body: { [key: string]: string | number } | null,
  injector: Injector,
) => {
  const ls = injector.get(LocalStorage);

  // Define store manipulation functions
  const getStore = () => {
    if (!Store) {
      const data = ls.getJSON(STORE_KEY) as MockStore;
      Store = data || (MockData as MockStore);
    }
    return Store;
  };
  const updateStore = (updater: (s: MockStore) => MockStore) => {
    Store = updater(structuredClone(getStore()));
    ls.setJSON(STORE_KEY, Store);
  };

  const routeParams = url.replace(environment.apiUrl + '/', '').split('/');
  const resource = routeParams[0];

  // POST /boards/{id}/lists
  const handleListsCreate = (_: string) => {
    const list = {
      id: 'ls' + Date.now(),
      name: body ? (body['name'] as string) : '',
    };

    updateStore((s: MockStore) => {
      s.board.lists.push(list);
      return s;
    });

    return list;
  };

  // PUT /boards/{id}/lists/{list_id}
  const handleListsUpdate = (_: string, listId: string) => {
    const name = body ? (body['name'] as string) : '';
    const pos = body && body['pos'] ? (body['pos'] as number) : -1;

    // WARNING: The code assumes that the ID exists. No handling for missing IDs.
    const idx = getStore().board.lists.findIndex((l) => l.id === listId);

    const currentList = getStore().board.lists[idx];
    const updatedList = {
      ...currentList,
      ...{ name },
    };

    updateStore((s) => {
      if (pos === -1) {
        s.board.lists[idx] = updatedList;
      } else {
        s.board.lists.splice(idx, 1); // Remove from old pos
        s.board.lists.splice(pos, 0, updatedList); // Insert at new pos
      }
      return s;
    });

    return updatedList;
  };

  // DELETE /boards/{id}/lists/{list_id}
  const handleListsDelete = (_: string, listId: string) => {
    // WARNING: The code assumes that the ID exists. No handling for missing IDs.
    const idx = getStore().board.lists.findIndex((l) => l.id === listId);

    updateStore((s: MockStore) => {
      s.board.lists.splice(idx, 1);
      return s;
    });
  };

  // Resource: /boards/{id}/lists
  const resourceLists = (boardId: string, listId: string) => {
    switch (method) {
      case 'POST':
        return handleListsCreate(boardId);
      case 'PUT':
        return handleListsUpdate(boardId, listId);
      case 'DELETE':
        return handleListsDelete(boardId, listId);
    }
    return {};
  };

  // POST /boards/{id}/labels
  const handleLabelsCreate = (_: string) => {
    const cBody = body as ApiRequestLabel;
    const label = {
      id: 'l' + Date.now(),
      name: cBody['name'] || '',
      color: cBody['color'] || '',
    };

    updateStore((s) => {
      s.board.labels.push(label);
      return s;
    });

    return label;
  };

  // PUT /boards/{id}/labels/{label_id}
  const handleLabelsUpdate = (_: string, labelId: string) => {
    const cBody = body as ApiRequestLabel;
    const changes = {
      ...(cBody['name'] ? { name: cBody['name'] } : {}),
      ...(cBody['color'] ? { color: cBody['color'] } : {}),
    };

    // WARNING: The code assumes that the ID exists. No handling for missing IDs.
    const idx = getStore().board.labels.findIndex((l) => l.id === labelId);

    const currentLabel = getStore().board.labels[idx];
    const updatedLabel = {
      ...currentLabel,
      ...changes,
    };

    updateStore((s) => {
      s.board.labels[idx] = updatedLabel;
      return s;
    });

    return updatedLabel;
  };

  // DELETE /boards/{id}/labels/{label_id}
  const handleLabelsDelete = (_: string, labelId: string) => {
    // WARNING: The code assumes that the ID exists. No handling for missing IDs.
    const idx = getStore().board.labels.findIndex((l) => l.id === labelId);

    getStore().board.labels.splice(idx, 1);

    // Remove from cards
    updateStore((s) => {
      s.cards.forEach((card) => {
        const lIdx = card.labelIds.indexOf(labelId);
        if (lIdx > -1) {
          card.labelIds.splice(lIdx, 1);
        }
      });
      return s;
    });
  };

  // Resource: /boards/{id}/labels
  const resourceLabels = (boardId: string, labelId: string) => {
    switch (method) {
      case 'POST':
        return handleLabelsCreate(boardId);
      case 'PUT':
        return handleLabelsUpdate(boardId, labelId);
      case 'DELETE':
        return handleLabelsDelete(boardId, labelId);
    }
    return {};
  };

  // GET /boards/{id}
  const handleBoardsGet = (_: string) => ({
    ...getStore().board,
    lists: getStore().board.lists.map((list) => ({
      id: list.id,
      name: list.name,
      // The cards are populated from Store.cards
      cards: getStore()
        .cards.filter((c) => c.listId === list.id)
        .sort((a, b) => a.pos - b.pos)
        .map((c) => ({
          id: c.id,
          title: c.title,
          labelIds: c.labelIds,
        })),
    })),
  });

  // Resource: /boards
  const resourceBoards = () => {
    const [, boardId, secondaryResource, secId] = routeParams;

    if (method === 'GET' && !secondaryResource) {
      return handleBoardsGet(boardId);
    }

    switch (secondaryResource) {
      case 'lists':
        return resourceLists(boardId, secId);
      case 'labels':
        return resourceLabels(boardId, secId);
    }

    return {};
  };

  // GET /cards/{id}
  const handleCardsGet = (cardId: string) => {
    const idx = getStore().cards.findIndex((c) => c.id === cardId);

    return getStore().cards[idx] || {};
  };

  // POST /cards/{id}
  const handleCardsCreate = () => {
    const insertOnTop = (body as any)['insertOnTop'] as boolean;
    const rCard = (body as any)['card'] as ApiRequestCard;

    const card = {
      id: 'c' + Date.now(),
      title: rCard['title'] || '',
      labelIds: [],
      listId: rCard['listId'] || '',
      description: rCard['description'] || '',
      pos: !insertOnTop ? -1 : 0,
    };

    if (!insertOnTop) {
      const listId = rCard['listId'] || '';

      // WARNING: The code assumes that the ID exists. No handling for missing IDs.
      const listCardsCount = getStore().cards.filter(
        (c) => c.listId === listId,
      ).length;
      card.pos = listCardsCount;
    } else {
      updateStore((s) => {
        s.cards.forEach((card) => card.pos++);
        return s;
      });
    }

    updateStore((s) => {
      s.cards.push(card);
      return s;
    });

    return card;
  };

  // PUT /cards/{id}
  const handleCardsUpdate = (cardId: string) => {
    const cBody = body as ApiRequestCard;

    const changes = {
      ...(cBody['pos'] ? { pos: cBody['pos'] } : {}),
      ...(cBody['listId'] ? { listId: cBody['listId'] } : {}),
      ...(cBody['title'] ? { title: cBody['title'] } : {}),
      ...(cBody['description'] ? { description: cBody['description'] } : {}),
      ...(cBody['labelIds'] ? { labelIds: cBody['labelIds'] } : {}),
    };

    // WARNING: The code assumes that the ID exists. No handling for missing IDs.
    const idx = getStore().cards.findIndex((c) => c.id === cardId);
    const currentCard = getStore().cards[idx];
    const updatedCard = {
      ...currentCard,
      ...changes,
    };

    // We can just substitute the card in the cards list
    // since the position is already part of the object and
    // the order in the array doesn't matter.
    updateStore((s) => {
      s.cards[idx] = updatedCard;
      return s;
    });

    return updatedCard;
  };

  // DELETE /cards/{id}
  const handleCardsDelete = (cardId: string) => {
    // WARNING: The code assumes that the ID exists. No handling for missing IDs.
    const idx = getStore().cards.findIndex((c) => c.id === cardId);

    updateStore((s) => {
      s.cards.splice(idx, 1);
      return s;
    });
  };

  // Resource: /cards
  const resourceCards = () => {
    const [, cardId] = routeParams;

    switch (method) {
      case 'GET':
        return handleCardsGet(cardId);
      case 'POST':
        return handleCardsCreate();
      case 'PUT':
        return handleCardsUpdate(cardId);
      case 'DELETE':
        return handleCardsDelete(cardId);
    }

    return {};
  };

  let response: any = {};

  // Route handling
  switch (resource) {
    case 'boards':
      response = resourceBoards();
      break;
    case 'cards':
      response = resourceCards();
      break;
  }

  return response;
};
