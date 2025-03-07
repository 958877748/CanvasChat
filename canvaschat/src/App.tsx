import React from 'react';
import './App.css';
import FlowChart from './components/FlowChart';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>React Flow Demo</h1>
        <p>A simple flowchart application built with React Flow</p>
      </header>
      <main>
        <FlowChart />
      </main>
    </div>
  );
}

export default App;
