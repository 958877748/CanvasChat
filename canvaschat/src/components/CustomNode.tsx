import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

interface CustomNodeData {
  label: string;
  description?: string;
}

const CustomNode = ({ data }: NodeProps<CustomNodeData>) => {
  return (
    <div className="custom-node">
      <Handle type="target" position={Position.Top} />
      <div className="custom-node-header">{data.label}</div>
      {data.description && (
        <div className="custom-node-description">{data.description}</div>
      )}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

export default memo(CustomNode); 