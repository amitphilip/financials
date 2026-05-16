"use client";

import { createContext, useContext, useState } from "react";

type NumbersContextValue = {
  hidden: boolean;
  toggle: () => void;
};

const NumbersContext = createContext<NumbersContextValue>({
  hidden: true,
  toggle: () => {},
});

export function NumbersProvider({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(false);
  return (
    <NumbersContext.Provider value={{ hidden, toggle: () => setHidden((h) => !h) }}>
      {children}
    </NumbersContext.Provider>
  );
}

export function useNumbers() {
  return useContext(NumbersContext);
}
