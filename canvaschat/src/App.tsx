import React from 'react';
import './App.css';
import FlowChart from './components/FlowChart';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Flowchart Designer</h1>
        <p>Create professional diagrams with this interactive flow builder</p>
      </header>
      <main>
        <FlowChart />
      </main>
    </div>
  );
}

export default App;
