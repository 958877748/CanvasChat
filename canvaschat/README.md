# React Flow Demo

This is a simple flowchart application built with React Flow. It demonstrates how to create interactive node-based diagrams in a React application.

## Features

- Interactive node-based diagram
- Draggable nodes
- Connectable edges
- Custom node types
- Minimap for navigation
- Background grid

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

### Running the Application

Start the development server:

```bash
npm start
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## Usage

- **Drag nodes**: Click and drag to move nodes around
- **Connect nodes**: Drag from a node's handle to another node's handle
- **Pan canvas**: Hold space bar and drag, or use the mouse wheel
- **Zoom**: Use mouse wheel or pinch gesture

## Project Structure

- `src/components/FlowChart.tsx`: Main component that renders the React Flow diagram
- `src/components/CustomNode.tsx`: Custom node component
- `src/App.tsx`: Main application component
- `src/App.css`: Styling for the application

## Learn More

To learn more about React Flow, check out the [React Flow documentation](https://reactflow.dev/).

## License

This project is licensed under the MIT License.
