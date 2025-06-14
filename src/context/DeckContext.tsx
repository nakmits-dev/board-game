import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { MonsterType } from '../types/gameTypes';
import { masterData } from '../data/cardData';

export interface DeckData {
  master: keyof typeof masterData;
  monsters: MonsterType[];
}

export interface DeckState {
  hostDeck?: DeckData;
  guestDeck?: DeckData;
  isValid: boolean;
}

type DeckAction =
  | { type: 'SET_HOST_DECK'; deck: DeckData }
  | { type: 'SET_GUEST_DECK'; deck: DeckData }
  | { type: 'SET_BOTH_DECKS'; hostDeck: DeckData; guestDeck: DeckData }
  | { type: 'CLEAR_DECKS' }
  | { type: 'RESET_TO_DEFAULT' };

interface DeckContextType {
  state: DeckState;
  dispatch: React.Dispatch<DeckAction>;
  setHostDeck: (deck: DeckData) => void;
  setGuestDeck: (deck: DeckData) => void;
  setBothDecks: (hostDeck: DeckData, guestDeck: DeckData) => void;
  clearDecks: () => void;
  resetToDefault: () => void;
  isGameReady: () => boolean;
}

const DeckContext = createContext<DeckContextType | undefined>(undefined);

// デフォルトデッキ
const DEFAULT_HOST_DECK: DeckData = {
  master: 'blue',
  monsters: ['wolf', 'bear', 'golem']
};

const DEFAULT_GUEST_DECK: DeckData = {
  master: 'red',
  monsters: ['bear', 'wolf', 'golem']
};

function deckReducer(state: DeckState, action: DeckAction): DeckState {
  switch (action.type) {
    case 'SET_HOST_DECK': {
      const newState = {
        ...state,
        hostDeck: action.deck,
      };
      return {
        ...newState,
        isValid: !!(newState.hostDeck && newState.guestDeck),
      };
    }

    case 'SET_GUEST_DECK': {
      const newState = {
        ...state,
        guestDeck: action.deck,
      };
      return {
        ...newState,
        isValid: !!(newState.hostDeck && newState.guestDeck),
      };
    }

    case 'SET_BOTH_DECKS': {
      return {
        hostDeck: action.hostDeck,
        guestDeck: action.guestDeck,
        isValid: true,
      };
    }

    case 'CLEAR_DECKS': {
      return {
        hostDeck: undefined,
        guestDeck: undefined,
        isValid: false,
      };
    }

    case 'RESET_TO_DEFAULT': {
      return {
        hostDeck: DEFAULT_HOST_DECK,
        guestDeck: DEFAULT_GUEST_DECK,
        isValid: true,
      };
    }

    default:
      return state;
  }
}

export const DeckProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(deckReducer, {
    hostDeck: DEFAULT_HOST_DECK,
    guestDeck: DEFAULT_GUEST_DECK,
    isValid: true,
  });

  const setHostDeck = (deck: DeckData) => {
    dispatch({ type: 'SET_HOST_DECK', deck });
  };

  const setGuestDeck = (deck: DeckData) => {
    dispatch({ type: 'SET_GUEST_DECK', deck });
  };

  const setBothDecks = (hostDeck: DeckData, guestDeck: DeckData) => {
    dispatch({ type: 'SET_BOTH_DECKS', hostDeck, guestDeck });
  };

  const clearDecks = () => {
    dispatch({ type: 'CLEAR_DECKS' });
  };

  const resetToDefault = () => {
    dispatch({ type: 'RESET_TO_DEFAULT' });
  };

  const isGameReady = () => {
    return state.isValid && !!(state.hostDeck && state.guestDeck);
  };

  return (
    <DeckContext.Provider
      value={{
        state,
        dispatch,
        setHostDeck,
        setGuestDeck,
        setBothDecks,
        clearDecks,
        resetToDefault,
        isGameReady,
      }}
    >
      {children}
    </DeckContext.Provider>
  );
};

export const useDeck = (): DeckContextType => {
  const context = useContext(DeckContext);
  if (context === undefined) {
    throw new Error('useDeck must be used within a DeckProvider');
  }
  return context;
};