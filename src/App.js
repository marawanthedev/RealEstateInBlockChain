import { seState, useState } from "react";

// Components
import Navigation from "./components/Navigation";
import Search from "./components/Search";

function App() {
  const [account, setAccount] = useState(null);

  return (
    <div>
      <Navigation account={account} setAccount={setAccount} />
      <Search />

      <div className="cards__section">
        <h3>Homes For You</h3>
        <hr />
      </div>
    </div>
  );
}

export default App;
