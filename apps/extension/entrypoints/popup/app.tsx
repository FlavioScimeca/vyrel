import { useCallback, useState } from "react";

import "./App.css";

function App() {
  const [count, setCount] = useState(0);

  const increment = useCallback(() => setCount((value) => value + 1), []);

  return (
    <main>
      <p className="eyebrow">Better Fullstack Extension</p>
      <h1>WXT + React</h1>
      <button onClick={increment} type="button">
        Count is {count}
      </button>
      <p className="hint">
        Edit the popup, background, or content entrypoints to get started.
      </p>
    </main>
  );
}

export default App;
